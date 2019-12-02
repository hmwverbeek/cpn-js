import { app, BrowserWindow, Menu, ipcMain, ipcRenderer } from 'electron';
import { spawn } from 'child_process';
import * as log from 'electron-log';
import * as path from 'path';
import * as url from 'url';

import { initSplashScreen, OfficeTemplate } from 'electron-splashscreen';
import { resolve } from 'app-root-path';
import * as isDev from 'electron-is-dev';

let mainWindow: BrowserWindow;
let loadingScreen: BrowserWindow;

let shellRunner;

app.on('ready', () => {
  createLoadingScreen();
  createWindow();
});

function initCpnServerUrl() {
  // CpnServerUrl.set('http://95.161.178.222:42020');
}

function createWindow() {
  const directory = isDev ? process.cwd().concat('/app') : process.env.APP_PATH;

  mainWindow = new BrowserWindow({ width: 1400, height: 900, show: false });
  mainWindow.setMenuBarVisibility(true);
  // mainWindow.setFullScreen(true);

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '/../../dist/cpn-ide/index.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  // mainWindow.webContents.openDevTools();

  // const hideSplashscreen = initSplashScreen({
  //   mainWindow,
  //   icon: isDev ? resolve('assets/icon.ico') : undefined,
  //   url: OfficeTemplate,
  //   width: 700,
  //   height: 400,
  //   brand: '',
  //   productName: 'CPN-IDE',
  //   logo: resolve('assets/logo.svg'),
  //   website: 'https://github.com/cpn-io/cpn-js',
  //   text: 'Initializing ...'
  // });

  // mainWindow.once('ready-to-show', () => {
  //   mainWindow.show();
  //   hideSplashscreen();
  // });

  ipcMain.on('app.init.complete', function (event, arg) {
    setTimeout(() => {
      mainWindow.show();
      if (loadingScreen) {
        loadingScreen.close();
      }
    }, 3000);
  });


  // App close handler
  app.on('before-quit', function () {
    killCpnServer();
  });

  log.info('APP PATH = ', app.getAppPath());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  log.info('isDev = ', isDev);
  log.info('directory = ', directory);
  log.info('process.cwd() = ', process.cwd());
  log.info('__dirname = ', __dirname);

  var menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New project', click() { newProject() } },
        { type: 'separator' },
        { label: 'Open project', click() { openProject() }, accelerator: 'Ctrl+O' },
        { label: 'Save project', click() { saveProject() }, accelerator: 'Ctrl+S' },
        { type: 'separator' },
        { label: 'Exit', click() { app.quit() }, accelerator: 'Alt+F4' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Restart CPN server', click() { runCpnServer() } },
        { type: 'separator' },
        { label: 'Developer tools', click() { mainWindow.webContents.openDevTools() }, accelerator: 'F12' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu);

  setTimeout(() => runCpnServer(), 100);
}

function createLoadingScreen() {
  loadingScreen = new BrowserWindow({ width: 600, height: 400, frame: false, show: true, parent: mainWindow });
  loadingScreen.setMenuBarVisibility(false);
  loadingScreen.loadURL(
    url.format({
      pathname: path.join(__dirname, '/../splash.html'),
      protocol: 'file:',
      slashes: true,
    })
  );
  loadingScreen.on('closed', () => loadingScreen = null);
}


function runCpnServer() {
  killCpnServer();
  shellRunner = spawn("xterm", ["./run-server.sh"], { detached: true });
}

function killCpnServer() {
  if (shellRunner) {
    shellRunner.kill();
    log.info('SERVER Process has been killed!');
  }
}

function newProject() {
  mainWindow.webContents.send('main.menu.new.project');
}
function openProject() {
  mainWindow.webContents.send('main.menu.open.project');
}
function saveProject() {
  mainWindow.webContents.send('main.menu.save.project');
}

