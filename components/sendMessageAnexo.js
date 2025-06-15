const { BrowserWindow } = require('electron');

async function enviarMensagemComAnexo(sock, numero, mensagem, anexo) {
  try {
    const jidCheck = await sock.onWhatsApp(numero + '@s.whatsapp.net');
    if (!jidCheck || jidCheck.length === 0 || !jidCheck[0]?.exists) {
      console.log(`❌ Número ${numero} não existe no WhatsApp`);
      return;
    }

    const jid = jidCheck[0].jid;

    let tipoMime = anexo.tipo.split('/')[0];
    const buffer = Buffer.from(anexo.conteudo, 'base64');

    let payload = {
      caption: mensagem,
    };

    switch (tipoMime) {
      case 'image':
        payload.image = buffer;
        break;
      case 'video':
        payload.video = buffer;
        break;
      case 'audio':
        payload.audio = buffer;
        break;
      case 'application':
        payload.document = buffer;
        payload.mimetype = anexo.tipo;
        payload.fileName = anexo.nome;
        break;
      default:
        console.log('❌ Tipo de anexo não suportado:', anexo.tipo);
        return;
    }

    await sock.sendMessage(jid, payload);
    console.log(`✅ Mensagem com anexo enviada para ${numero}`);
    BrowserWindow.getAllWindows()[0].webContents.send('send-message');
  } catch (err) {
    console.error(`❌ Erro ao enviar anexo para ${numero}:`, err);
  }
}

module.exports = { enviarMensagemComAnexo };