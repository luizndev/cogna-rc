const { app, BrowserWindow, ipcMain  } = require('electron');
const path = require('path');

function createWindow() {ipcMain 
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  win.loadFile('interface/index.html'); // Carrega sua página
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Função que será chamada pelo botão
ipcMain.on('botao-clicado', () => {
  console.log('✅ Botão foi clicado!');
});