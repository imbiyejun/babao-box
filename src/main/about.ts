import { app, BrowserWindow } from 'electron'

// Send IPC to renderer to show the About modal
export function showAbout(mainWindow: BrowserWindow | null): void {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('app:showAbout', app.getVersion())
  }
}
