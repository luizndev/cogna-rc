const membros = require('./membros.json');
const fs = require('fs');
const { gerarPagamento, verificarPagamento } = require('./pagamentos');
const { formatarData, hojeStr } = require('./utils');

async function verificarMembros(sock) {
    for (const numero in membros) {
        const membro = membros[numero];
        const hoje = new Date();
        const vencimento = new Date(membro.vencimento);

        if (hoje >= vencimento) {
            const pago = await verificarPagamento(membro.pagamento_id);

            if (pago) {
                membro.ultimo_pagamento = hojeStr();
                membro.vencimento = formatarData(hoje, 30);

                try {
                    await sock.groupParticipantsUpdate(membro.grupo, [numero], "add");
                    console.log(`✅ ${numero} renovou e foi adicionado ao grupo.`);
                } catch {
                    const code = await sock.groupInviteCode(membro.grupo);
                    await sock.sendMessage(numero + "@s.whatsapp.net", {
                        text: `✅ Pagamento confirmado!\nEntre novamente: https://chat.whatsapp.com/${code}`
                    });
                }

                salvar();
            } else {
                try {
                    await sock.groupParticipantsUpdate(membro.grupo, [numero], "remove");
                    console.log(`❌ ${numero} removido do grupo.`);
                } catch (err) {
                    console.log(`Erro ao remover ${numero}:`, err.message);
                }

                await cobrar(sock, numero, membro);
            }
        }
    }
}

async function cobrar(sock, numero, membro) {
    const pagamento = await gerarPagamento(numero);

    membro.pagamento_id = pagamento.id;
    salvar();

    const msg = `
🔔 *Seu acesso expirou!*
Faça o pagamento para continuar:

*Valor:* R$19,90
📅 *Validade:* 30 dias

🔗 *Pix Copia e Cola:*
${pagamento.copia_e_cola}`;

    await sock.sendMessage(numero + "@s.whatsapp.net", { text: msg });

    await sock.sendMessage(numero + "@s.whatsapp.net", {
        image: { url: pagamento.qr_code_base64 },
        caption: '📸 Escaneie o QR Code para pagar via Pix'
    });
}

function salvar() {
    fs.writeFileSync('./membros.json', JSON.stringify(membros, null, 2));
}

module.exports = { verificarMembros };
