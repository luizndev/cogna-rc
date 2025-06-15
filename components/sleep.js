function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

module.exports = { sleep };