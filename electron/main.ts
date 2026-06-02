import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import { initDatabase, saveDbSync } from './db';
import { registerIpcHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '叙世 · ScriptWeaver',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await initDatabase();
  registerIpcHandlers();

  /** Register local-file protocol for avatar images / 注册本地文件协议加载头像 */
  protocol.handle('local-file', (request) => {
    const url = request.url.replace('local-file://', '');
    const filePath = decodeURIComponent(url);
    return net.fetch(`file://${filePath}`);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/** Force sync DB save before quit to avoid losing last 500ms of writes.
 *  退出前强制同步保存数据库，防止丢失最后 500ms 的写入。 */
app.on('before-quit', () => {
  saveDbSync();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { mainWindow };
