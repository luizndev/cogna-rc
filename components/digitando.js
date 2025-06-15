// ENVIAR DIGITANDO (PARA EVITAR BAN)
async function digitarMensagem(sock, jid, mensagem, delay = 100) {
   await sock.sendPresenceUpdate('composing', jid);

   let textoFinal = "";

   for (let letra of mensagem) {
     textoFinal += letra;
     await new Promise(resolve => setTimeout(resolve, delay));
   }

   await sock.sendPresenceUpdate('paused', jid);
   await sock.sendMessage(jid, { text: textoFinal });
}


module.exports = { digitarMensagem };