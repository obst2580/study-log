import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './database';
import { registerIpcHandlers } from './ipc';
import { startReviewScheduler } from './services/reviewScheduler';
import { setupAutoBackup } from './services/backup';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'StudyLog',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: '오늘 할 것 보기',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('navigate', '/kanban');
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        mainWindow?.destroy();
        app.quit();
      },
    },
  ]);

  tray.setToolTip('StudyLog');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();
  createTray();
  startReviewScheduler(mainWindow);
  setupAutoBackup();
});

app.on('before-quit', () => {
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
