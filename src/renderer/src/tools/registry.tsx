import { lazy } from 'react'
import { ScissorOutlined, PictureOutlined, FilePdfOutlined } from '@ant-design/icons'
import type { ToolDefinition } from '../types/tool'

// Extensible tool registry: add new tools by appending entries
export const tools: ToolDefinition[] = [
  {
    id: 'audio-editor',
    name: '音频剪辑',
    description: '剪裁音频文件，选取指定片段并保存',
    icon: <ScissorOutlined />,
    path: '/tools/audio-editor',
    component: lazy(() => import('../pages/tools/AudioEditor'))
  },
  {
    id: 'image-processor',
    name: '图片处理',
    description: '剪裁、水印、压缩、格式转换',
    icon: <PictureOutlined />,
    path: '/tools/image-processor',
    component: lazy(() => import('../pages/tools/ImageProcessor'))
  },
  {
    id: 'pdf-processor',
    name: 'PDF处理',
    description: '转图片、转Word、合并、拆分、压缩、水印',
    icon: <FilePdfOutlined />,
    path: '/tools/pdf-processor',
    component: lazy(() => import('../pages/tools/PdfProcessor'))
  }
]
