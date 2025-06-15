const { app, BrowserWindow, ipcMain, globalShortcut  } = require('electron');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const { Buffer } = require('buffer');

// MODULOS IMPORTADOS
const { enviarMensagemComAnexo } = require('./components/sendMessageAnexo.js');
const { enviarMensagemParaNumero } = require('./components/sendMessage.js');
const { createWindow } = require('./components/createWindow.js');
const { enviarMensagemParaNumeroGrupo } = require('./components/sendMessageGroup.js')
const { enviarMensagemComAnexoGrupo } = require('./components/sendMessageGroupAnexo.js')

let sock = null;
let isConnected = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({ version, auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // if (qr) qrcode.generate(qr, { small: true });
    if (qr) {
      console.log("🔳 QR Code recebido. Escaneie para conectar:");
      BrowserWindow.getAllWindows()[0].webContents.send('qr-code', qr);
    };

    if (connection === 'close') {
      isConnected = false;

      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔄 Conexão fechada:', lastDisconnect?.error?.message, 'Reconnecting?', shouldReconnect);

      if (shouldReconnect) {
        await startBot();
      }
    }

    if (connection === 'open') {
      isConnected = true;
      const mainWindow = BrowserWindow.getAllWindows()[0];
      mainWindow.webContents.send('verify-connect', isConnected);
      console.log('✅ Bot conectado!');

      const userJid = sock.user.id;
      const nome = sock.user.name;

      try {
        const fotoPerfil = await sock.profilePictureUrl(userJid, 'image');
        
        const chats = await sock.groupFetchAllParticipating();
        const grupos = Object.values(chats).map(grupo => ({
          id: grupo.id,
          nome: grupo.subject,
          participants: grupo.participants,
          participantes: grupo.participants.length
        }));

        mainWindow.webContents.send('dados-usuario', {
          nome,
          numero: userJid,
          foto: fotoPerfil,
          grupos
        });

      } catch (err) {
        console.error('Erro ao buscar dados do perfil:', err);
      }
    }

  });

  return sock;
}

function waitForConnection() {
  return new Promise((resolve) => {
    if (isConnected) return resolve();
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') resolve();
    });
  });
}

// Enviar mensagens para a lista
async function enviarMensagens(sock, lista) {
  await waitForConnection();

  for (const item of lista) {
    const { numero, mensagem, anexo, digitando } = item;
    console.log(`📨 Enviando para ${numero}...`);

    if (anexo) {
      await enviarMensagemComAnexo(sock, numero, mensagem, anexo, digitando);
    } else {
      await enviarMensagemParaNumero(sock, numero, mensagem, digitando);
    }
  }

  console.log('✅ Todas as mensagens foram processadas.');
}

// Enviar mensagens para a lista grupo
async function enviarMensagensGrupo(sock, lista) {
  await waitForConnection();

  for (const item of lista) {
    const { grupoId, grupoNome, mensagem, anexo, digitando } = item;
    console.log(`📨 Enviando para ${grupoNome}...`);

    if (anexo) {
      await enviarMensagemComAnexoGrupo(sock, grupoId, mensagem, anexo, digitando);
    } else {
      await enviarMensagemParaNumeroGrupo(sock, grupoId, mensagem, digitando);
    }
  }

  console.log('✅ Todas as mensagens foram processadas.');
}
// function createWindow() {
//   const win = new BrowserWindow({
//     width: 1024,
//     height: 616,
//     resizable: false,
//     maximizable: false,
//     show: false,
//     webPreferences: {
//       contextIsolation: false,
//       nodeIntegration: true
//     },
//     icon: path.join(__dirname, 'interface', 'assets/favicon.png')
//   });

//   win.setMenu(null);

//   win.once('ready-to-show', () => {
//     win.show();
//   });
//   win.loadFile('interface/index.html');
// }

app.whenReady().then(async () => {
  createWindow();

  globalShortcut.register('Control+Shift+P', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.openDevTools();
    }
  });

  await startBot();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('enviar-lista', async (event, lista) => {
  // printInsert(JSON.stringify(lista));
  enviarMensagens(sock, lista);
});

ipcMain.on('enviar-grupo', (event, dados) => {
  console.log('Mensagem recebida no main:', dados);
  enviarMensagensGrupo(sock, dados)
  // Aqui você envia para o back-end via HTTP ou manipula como quiser
});


// FAZER LOGOUT, DESTUIR SESSÃO E TUDO MAIS!
ipcMain.on('realizar-logout', () => {
  try {
    fs.rmdirSync('./auth', { recursive: true });
    console.log('Pasta removida com sucesso!');
  } catch (err) {
    console.error('Erro ao remover a pasta:', err);
  }
});