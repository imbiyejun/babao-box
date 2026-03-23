import type { ReactNode, LazyExoticComponent, ComponentType } from 'react'

export interface ToolDefinition {
  id: string
  name: string
  description: string
  icon: ReactNode
  path: string
  component: LazyExoticComponent<ComponentType>
}
