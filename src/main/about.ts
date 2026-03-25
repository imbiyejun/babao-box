import { app, dialog, BrowserWindow } from 'electron'

export function showAboutDialog(parent?: BrowserWindow | null): void {
  const version = app.getVersion()

  dialog.showMessageBox({
    ...(parent ? { parent } : {}),
    type: 'info',
    title: '关于八宝盒',
    message: '八宝盒',
    detail: [
      `版本：${version}`,
      '作者：imbiyejun',
      '联系方式：imbiyejun@163.com',
      '',
      '一款实用的离线工具集合'
    ].join('\n'),
    buttons: ['确定'],
    icon: undefined
  })
}
