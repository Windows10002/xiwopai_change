/** 待开始 / 进行中 / 已完成 */
export type TaskStatus = 'pending' | 'doing' | 'done'

export type TaskPriority = 'high' | 'medium' | 'low'

export type DisplayFilter = 'all' | 'high' | 'done'

/** 思维导图节点（与画布方块 1:1，根节点仅用于树，不显示在画布） */
export interface MindNode {
  id: string
  /** 父节点 id；一级事项的 parentId 为 ROOT_ID */
  parentId: string
  name: string
  collapsed: boolean
  sortOrder: number
  priority: TaskPriority
  status: TaskStatus
  notes: string
  x: number
  y: number
  width: number
  height: number
}

export interface Viewport {
  tx: number
  ty: number
  zoom: number
}

/** 一份完整的梳理方案（可切换不同天/项目） */
export interface Workspace {
  id: string
  name: string
  rootName: string
  nodes: MindNode[]
  selectedNodeId: string | null
  viewport: Viewport
  filter: DisplayFilter
  /** 侧栏/画布搜索关键词 */
  searchQuery: string
  /** 隐藏已完成节点 */
  hideCompleted: boolean
}

export interface AppStorage {
  activeWorkspaceId: string
  workspaces: Workspace[]
}

export const ROOT_ID = 'root'
