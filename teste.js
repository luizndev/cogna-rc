(async () => {
  try {
    const gerarPix = require('./gerar-pix');
    const result = await gerarPix('teste@exemplo.com', 10);
    console.log('Pix gerado:', result);
  } catch (err) {
    console.error(err);
  }
})();
