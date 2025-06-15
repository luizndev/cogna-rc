const { BrowserWindow } = require('electron');
const { digitarMensagem } = require('./digitando');

async function enviarMensagemParaNumero(sock, numero, mensagem, digitando) {
  try {
    const jidCheck = await sock.onWhatsApp(numero + '@s.whatsapp.net');
    
    if (!jidCheck || jidCheck.length === 0 || !jidCheck[0]?.exists) {
      console.log(`❌ Número ${numero} não existe no WhatsApp`);
      return;
    }

    const jid = jidCheck[0].jid;

    switch (digitando) {
      case 1:
        await digitarMensagem(sock, jid, mensagem, 120);
        break
      default:
        await sock.sendMessage(jid, { text: mensagem });
        break
    }

    console.log(`✅ Mensagem enviada para ${numero}`);
    BrowserWindow.getAllWindows()[0].webContents.send('send-message');
  
    
  } catch (err) {
    console.error(`❌ Erro ao enviar mensagem para ${numero}:`, err);
  }
}

module.exports = { enviarMensagemParaNumero }