function formatarData(data, dias) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    return nova.toISOString().split('T')[0];
}

function hojeStr() {
    return new Date().toISOString().split('T')[0];
}

module.exports = { formatarData, hojeStr };
