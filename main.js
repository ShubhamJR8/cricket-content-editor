const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const kill = require('tree-kill');
const { machineIdSync } = require('node-machine-id');

let mainWindow;
let splashWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === 'development';
const backendPort = 8080;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false, // Don't show until ready-to-show
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Set to false for easier context access in this MVP
    },
    title: "Reel Cricket"
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  console.log('Starting backend...');
  
  const jarPath = isDev 
    ? path.join(__dirname, 'backend/target/videoslicer-0.0.1-SNAPSHOT.jar')
    : path.join(process.resourcesPath, 'backend.jar');

  if (isDev) {
    // In dev mode, we assume concurrently has already started the backend.
    checkBackendHealth();
    return;
  }

  const jrePath = isDev 
    ? null 
    : path.join(process.resourcesPath, 'jre', 'bin', process.platform === 'win32' ? 'java.exe' : 'java');

  const javaBinary = (jrePath && require('fs').existsSync(jrePath)) ? jrePath : 'java';

  const ffmpegPath = isDev 
    ? 'ffmpeg' 
    : path.join(process.resourcesPath, 'bin', process.platform, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  
  const ffprobePath = isDev 
    ? 'ffprobe' 
    : path.join(process.resourcesPath, 'bin', process.platform, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

  console.log(`Using FFmpeg at: ${ffmpegPath}`);

  backendProcess = spawn(javaBinary, [
    '-jar', jarPath,
    `--ffmpeg.path=${ffmpegPath}`,
    `--ffprobe.path=${ffprobePath}`
  ]);

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  checkBackendHealth();
}

function checkBackendHealth() {
  const options = {
    hostname: 'localhost',
    port: backendPort,
    path: '/actuator/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('Backend is ready!');
      createMainWindow();
    } else {
      setTimeout(checkBackendHealth, 1000);
    }
  });

  req.on('error', () => {
    setTimeout(checkBackendHealth, 1000);
  });

  req.end();
}

// IPC Handlers for Native Bridge
ipcMain.handle('get-machine-id', () => {
  return machineIdSync();
});

ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov'] }
    ]
  });
  if (!canceled) {
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('open-directory-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });
  if (!canceled) {
    return filePaths[0];
  }
  return null;
});

const { shell } = require('electron');
const fs = require('fs');

ipcMain.handle('open-path', async (event, targetPath) => {
  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    const errorMessage = await shell.openPath(targetPath);
    if (errorMessage) {
      console.error('Failed to open path natively:', errorMessage);
    }
  } catch (err) {
    console.error('Error in open-path handler:', err);
  }
});

app.on('ready', () => {
  createSplashWindow();
  startBackend();
});

function cleanup() {
  if (backendProcess && backendProcess.pid) {
    console.log('Killing backend process tree...');
    kill(backendProcess.pid);
  }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', cleanup);

process.on('exit', cleanup);
process.on('SIGINT', () => { app.quit(); });
process.on('SIGTERM', () => { app.quit(); });
