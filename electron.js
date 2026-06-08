const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#030712', // Matches your custom "Void Space" background color
    autoHideMenuBar: true,      // Hides the old-fashioned "File, Edit, View" window menu
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // This tells Electron to load the final built version of your React interface
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});