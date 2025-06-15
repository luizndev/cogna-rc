const { BrowserWindow } = require('electron');

async function enviarMensagemComAnexoGrupo(sock, grupoId, mensagem, anexo) {
  try {
    const jid = grupoId.endsWith('@g.us') ? grupoId : `${grupoId}@g.us`;

    const grupoExiste = await sock.groupMetadata(jid).catch(() => null);
    if (!grupoExiste) {
      console.log(`❌ Grupo com ID ${grupoId} não foi encontrado.`);
      return;
    }

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
    console.log(`✅ Mensagem com anexo enviada para o grupo ${grupoId}`);
    BrowserWindow.getAllWindows()[0].webContents.send('send-message-grupo');
  } catch (err) {
    console.error(`❌ Erro ao enviar anexo para o grupo ${grupoId}:`, err);
  }
}

module.exports = { enviarMensagemComAnexoGrupo };
