const { BrowserWindow } = require('electron');
const { digitarMensagem } = require('./digitando');

async function enviarMensagemParaNumeroGrupo(sock, grupoID, mensagem, digitando) {
  try {
    const jid = grupoID.endsWith('@g.us') ? grupoID : `${grupoID}@g.us`;

    const chat = await sock.groupMetadata(jid).catch(() => null);

    if (!chat) {
      console.log(`❌ Grupo com ID ${grupoID} não foi encontrado.`);
      return;
    }

    if (digitando === 1) {
      await digitarMensagem(sock, jid, mensagem, 120);
    } else {
      await sock.sendMessage(jid, { text: mensagem });
    }

    console.log(`✅ Mensagem enviada para o grupo ${grupoID}`);
    BrowserWindow.getAllWindows()[0].webContents.send('send-message-grupo');

  } catch (err) {
    console.error(`❌ Erro ao enviar mensagem para o grupo ${grupoID}:`, err);
  }
}

module.exports = { enviarMensagemParaNumeroGrupo };
