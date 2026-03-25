import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { showAboutDialog } from './about'

let tray: Tray | null = null

export function createTray(getMainWindow: () => BrowserWindow | null): Tray {
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(icon)
  tray.setToolTip('八宝盒')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开八宝盒',
      click: (): void => {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '关于八宝盒',
      click: (): void => {
        showAboutDialog(getMainWindow())
      }
    },
    { type: 'separator' },
    {
      label: '退出八宝盒',
      click: (): void => {
        // Flag to distinguish real quit from close-to-tray
        app.exit(0)
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    const win = getMainWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
