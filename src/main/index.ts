import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { registerDialogHandlers } from './ipc/dialog'
import { registerFileHandlers } from './ipc/file'
import { registerNcmHandlers } from './ipc/ncm'
import { createTray, destroyTray } from './tray'

// Single instance lock — focus existing window on second launch
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: '八宝盒',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow!.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Remove default application menu
  Menu.setApplicationMenu(null)

  registerDialogHandlers()
  registerFileHandlers()
  registerNcmHandlers()

  createWindow()
  createTray(getMainWindow)

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  destroyTray()
  // Remove close handler so the window can actually close
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
