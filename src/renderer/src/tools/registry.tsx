import { lazy } from 'react'
import { ScissorOutlined } from '@ant-design/icons'
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
  }
]
