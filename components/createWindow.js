const { BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 616,
    resizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
    icon: path.join(__dirname, '../interface', '/assets/favicon.png')
  });

  win.setMenu(null);

  win.once('ready-to-show', () => {
    win.show();
  });
  win.loadFile('interface/index.html');
}

module.exports = { createWindow }