import { ipcMain, dialog } from 'electron'

export function registerDialogHandlers(): void {
  ipcMain.handle(
    'dialog:openFile',
    async (_event, filters?: Electron.FileFilter[]) => {
      return dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters || [
          {
            name: 'Audio Files',
            extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma']
          },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
    }
  )

  ipcMain.handle(
    'dialog:saveFile',
    async (_event, defaultPath?: string, filters?: Electron.FileFilter[]) => {
      return dialog.showSaveDialog({
        defaultPath,
        filters:
          filters && filters.length > 0
            ? filters
            : [
                { name: 'WAV Audio', extensions: ['wav'] },
                { name: 'All Files', extensions: ['*'] }
              ]
      })
    }
  )
}
