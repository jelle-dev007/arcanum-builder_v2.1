const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#020204',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

// ── IPC: Save file with native Save-As dialog ─────────────────────────────────
ipcMain.handle('save-file', async (_event, { data, filename }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'Arcanum Archive', extensions: ['json'] }],
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true };
  }
  return { success: false };
});

// ── IPC: Choose auto-save location ────────────────────────────────────────────
ipcMain.handle('choose-autosave-path', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Choose Auto-save Location',
    defaultPath: 'arcanum_archive.json',
    filters: [{ name: 'Arcanum Archive', extensions: ['json'] }],
  });
  return canceled ? null : filePath;
});

// ── IPC: Silent auto-save write ───────────────────────────────────────────────
ipcMain.handle('autosave-write', async (_event, { path: filePath, data }) => {
  try {
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
