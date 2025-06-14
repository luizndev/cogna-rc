const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.PAGAMENTO_API;

async function gerarPagamento(numero) {
    const res = await axios.post(`${API_BASE}/gerar-pagamento`, { numero });
    return res.data;
}

async function verificarPagamento(id) {
    const res = await axios.get(`${API_BASE}/verificar-pagamento/${id}`);
    return res.data.pago === true;
}

module.exports = { gerarPagamento, verificarPagamento };
