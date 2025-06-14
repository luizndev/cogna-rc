const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const gerarPix = async (emailSend, valorSend) => {
    console.log(emailSend, valorSend)
    try {
        const fetch = (await import('node-fetch')).default;

        const response = await fetch('http://localhost:3001/create-pix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailSend, valor: valorSend })
        });

        if (!response.ok) {
            const errData = await response.json();
            console.error('Erro na resposta do servidor:', errData);
            throw new Error('Erro ao criar Pix');
        }

        const data = await response.json();
        
        if (data.teste) qrcode.generate(data.teste, { small: true });
        console.log({
            codigoPix: data.qrCodeUrl,
            qrCodeUrl: data.teste,
            paymentId: data.paymentId,
            status: data.status,
            status_detail: data.status_detail
        })
        return {
            codigoPix: data.qrCodeUrl,
            qrCodeUrl: data.teste,
            paymentId: data.paymentId,
            status: data.status,
            status_detail: data.status_detail
        };
    } catch (error) {
        console.error('Erro ao gerar Pix23232323:', error.message);
        throw new Error('Erro ao gerar Pix.');
    }
};

module.exports = gerarPix;
