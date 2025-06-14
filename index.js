const { app, BrowserWindow, ipcMain, globalShortcut  } = require('electron');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// 🔹 Referência global para o socket
let sock = null;

// 🔹 Flag para controlar se o socket está conectado
let isConnected = false;

// 🔹 Função global para log
function printInsert(valor) {
  console.log("Printou:", valor);
}

// 🔹 Função para iniciar o bot e retornar a instância do socket
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

      // Recupera informações do usuário logado
      const userJid = sock.user.id;
      const nome = sock.user.name;

      // Pega a foto de perfil
      try {
        const fotoPerfil = await sock.profilePictureUrl(userJid, 'image');
        
        // Pega todos os grupos
        const chats = await sock.groupFetchAllParticipating();
        const grupos = Object.values(chats).map(grupo => ({
          id: grupo.id,
          nome: grupo.subject,
          participantes: grupo.participants.length
        }));

        // Envia para o front-end
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

// Função que aguarda até o socket conectar
function waitForConnection() {
  return new Promise((resolve) => {
    if (isConnected) return resolve();
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') resolve();
    });
  });
}

// Enviar mensagem para número com verificação se existe no WhatsApp
async function enviarMensagemParaNumero(sock, numero, mensagem) {
  try {
    const jidCheck = await sock.onWhatsApp(numero + '@s.whatsapp.net');
    
    if (!jidCheck || jidCheck.length === 0 || !jidCheck[0]?.exists) {
      console.log(`❌ Número ${numero} não existe no WhatsApp`);
      return;
    }

    const jid = jidCheck[0].jid;

    await sock.sendMessage(jid, { text: mensagem });
    console.log(`✅ Mensagem enviada para ${numero}`);
    
  } catch (err) {
    console.error(`❌ Erro ao enviar mensagem para ${numero}:`, err);
  }
}


// Enviar mensagens para a lista
async function enviarMensagens(sock, lista) {
  await waitForConnection();

  for (const item of lista) {
    const numero = item.numero;
    const mensagem = item.mensagem;

    console.log(`📨 Enviando para ${numero}...`);
    await enviarMensagemParaNumero(sock, numero, mensagem);
  }

  console.log('✅ Todas as mensagens foram processadas.');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 616,
    resizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
    icon: path.join(__dirname, 'interface', 'assets/favicon.png')
  });

  win.setMenu(null);

  win.once('ready-to-show', () => {
    win.show();
  });
  win.loadFile('interface/index.html');
}

app.whenReady().then(async () => {
  createWindow();

  globalShortcut.register('Control+Shift+I', () => {
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
  printInsert(JSON.stringify(lista));
enviarMensagens(sock, lista);
});

// Função opcional para iniciar cobrança automática (ajustada)
async function iniciarCobranca(sock) {
    let usuarios;

    try {
        usuarios = JSON.parse(fs.readFileSync('./membros.json', 'utf8'));
    } catch (e) {
        console.error('Erro lendo membros.json:', e);
        return;
    }

    const agora = new Date();
    console.log('iniciarCobranca - Usuários carregados:', Object.keys(usuarios).length);

    for (const numero in usuarios) {
        const user = usuarios[numero];

        // Data para contar o prazo da cobrança
        const dataInicio = user.inicio_cobranca ? new Date(user.inicio_cobranca) : new Date(user.vencimento);
        const diferencaHoras = (agora - dataInicio) / 1000 / 60 / 60; // em horas

        console.log(`Checando usuário ${numero} - status: ${user.status} - horas desde início: ${diferencaHoras.toFixed(2)}`);

        if (user.status === 'pendente' && diferencaHoras >= 0 && diferencaHoras <= 24) {
            try {
                const cleanNumber = numero.replace(/\D/g, '');
                const jid = cleanNumber + '@s.whatsapp.net';

                if (!jid) {
                    console.log(`❌ Usuário ${numero} não tem jid salvo (não iniciou conversa)`);
                    continue;
                }


                const texto = `Olá Shinobi/Kunoichi, tudo bem com você?\n\nDeseja renovar o apoio do canal?\n\nSe sim, Digite "Play" para receber o QR code do Pix e renovar seu apoio. Assim, seu apoio será renovado por mais 30 dias.\n\nCaso não deseje renovar, ignore essa mensagem.`;

               await sock.sendMessage(jid, { 
                    text: texto 
                });


                console.log(`✅ Mensagem de cobrança enviada para ${numero}`);
            } catch (err) {
                console.error(`❌ Erro ao enviar mensagem para ${numero}:`, err);
            }
        } else {
            console.log(`⚠️ Usuário ${numero} não está pendente ou está fora do prazo de 24h.`);
        }
    }
}


// function verificarVencimentos() {
//     const hoje = new Date();
//     const hojeStr = hoje.toISOString().split('T')[0];

//     for (const numero in membros) {
//         const membro = membros[numero];
//         if (membro.vencimento <= hojeStr && membro.status === 'ok') {
//             console.log(`Vencimento expirado ou hoje para ${numero}`);

//             // Atualiza status para pendente
//             membro.status = 'pendente';

//             // Aqui você pode remover do grupo ou enviar aviso
//             // Exemplo (se quiser remover):
//             // await removerDoGrupo(numero, membro.grupo);
//         }
//     }

//     salvarMembros();
// }

// // Rodar a cada 30 minutos
// setInterval(verificarVencimentos, 30 * 60 * 1000);





