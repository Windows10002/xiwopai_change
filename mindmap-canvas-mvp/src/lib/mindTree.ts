import { newId } from '@/lib/id'
import type { MindNode, TaskStatus, Workspace } from '@/types'
import { ROOT_ID } from '@/types'

export function isRoot(id: string) {
  return id === ROOT_ID
}

/** 画布上显示的节点（排除根） */
export function canvasNodes(ws: Workspace): MindNode[] {
  return ws.nodes.filter((n) => !isRoot(n.id))
}

export function getNode(ws: Workspace, id: string): MindNode | undefined {
  return ws.nodes.find((n) => n.id === id)
}

export function getChildren(ws: Workspace, parentId: string): MindNode[] {
  return ws.nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getDescendantIds(ws: Workspace, nodeId: string): Set<string> {
  const ids = new Set<string>()
  const walk = (pid: string) => {
    for (const c of getChildren(ws, pid)) {
      ids.add(c.id)
      walk(c.id)
    }
  }
  walk(nodeId)
  return ids
}

function nextSortOrder(ws: Workspace, parentId: string) {
  const siblings = getChildren(ws, parentId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((s) => s.sortOrder)) + 1
}

export function createNode(
  parentId: string,
  partial?: Partial<Pick<MindNode, 'name' | 'x' | 'y'>>,
): MindNode {
  const id = newId('node')
  return {
    id,
    parentId,
    name: partial?.name ?? '新事项',
    collapsed: false,
    sortOrder: 0,
    priority: 'medium',
    status: 'pending',
    notes: '',
    x: partial?.x ?? 120 + Math.random() * 80,
    y: partial?.y ?? 120 + Math.random() * 80,
    width: 220,
    height: 88,
  }
}

export function addChildNode(ws: Workspace, parentId: string, spawn?: { x: number; y: number }): Workspace {
  const node = createNode(parentId, spawn)
  node.sortOrder = nextSortOrder(ws, parentId)
  return {
    ...ws,
    nodes: [...ws.nodes, node],
    selectedNodeId: node.id,
  }
}

export function updateNode(
  ws: Workspace,
  id: string,
  patch: Partial<Omit<MindNode, 'id'>>,
): Workspace {
  return {
    ...ws,
    nodes: ws.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  }
}

export function removeNode(ws: Workspace, id: string): Workspace {
  if (isRoot(id)) return ws
  const drop = getDescendantIds(ws, id)
  drop.add(id)
  const nodes = ws.nodes.filter((n) => !drop.has(n.id))
  const selectedNodeId = ws.selectedNodeId && drop.has(ws.selectedNodeId) ? null : ws.selectedNodeId
  return { ...ws, nodes, selectedNodeId }
}

export function toggleCollapsed(ws: Workspace, id: string): Workspace {
  const n = getNode(ws, id)
  if (!n) return ws
  return updateNode(ws, id, { collapsed: !n.collapsed })
}

export function setAllCollapsed(ws: Workspace, collapsed: boolean): Workspace {
  return {
    ...ws,
    nodes: ws.nodes.map((n) => (isRoot(n.id) ? n : { ...n, collapsed })),
  }
}

export function reorderSibling(
  ws: Workspace,
  nodeId: string,
  targetId: string,
  place: 'before' | 'after',
): Workspace {
  const node = getNode(ws, nodeId)
  const target = getNode(ws, targetId)
  if (!node || !target || node.parentId !== target.parentId || nodeId === targetId) return ws

  const siblings = getChildren(ws, node.parentId).filter((s) => s.id !== nodeId)
  const ti = siblings.findIndex((s) => s.id === targetId)
  if (ti < 0) return ws
  const insertAt = place === 'before' ? ti : ti + 1
  siblings.splice(insertAt, 0, node)
  const orderMap = new Map(siblings.map((s, i) => [s.id, i]))
  return {
    ...ws,
    nodes: ws.nodes.map((n) =>
      orderMap.has(n.id) ? { ...n, sortOrder: orderMap.get(n.id)! } : n,
    ),
  }
}

export function renameRoot(ws: Workspace, name: string) {
  return updateNode(ws, ROOT_ID, { name: name.trim() || '今日工作梳理' })
}

export function cycleStatus(status: TaskStatus): TaskStatus {
  if (status === 'pending') return 'doing'
  if (status === 'doing') return 'done'
  return 'pending'
}

export function matchesFilter(node: MindNode, filter: Workspace['filter']): boolean {
  if (filter === 'all') return true
  if (filter === 'high') return node.priority === 'high'
  if (filter === 'done') return node.status === 'done'
  return true
}

export function matchesSearch(node: MindNode, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    node.name.toLowerCase().includes(q) ||
    node.notes.toLowerCase().includes(q)
  )
}

/** 画布/列表是否显示该节点（不含树的祖先展开逻辑） */
export function nodePassesFilters(ws: Workspace, node: MindNode): boolean {
  if (ws.hideCompleted && node.status === 'done') return false
  if (!matchesSearch(node, ws.searchQuery)) return false
  if (!matchesFilter(node, ws.filter)) return false
  return true
}

/** 树在筛选模式下：自身匹配或存在可见后代 */
export function nodeVisibleInTree(ws: Workspace, nodeId: string): boolean {
  const node = getNode(ws, nodeId)
  if (!node) return false
  if (isRoot(nodeId)) return true
  if (nodePassesFilters(ws, node)) return true
  return getChildren(ws, nodeId).some((c) => nodeVisibleInTree(ws, c.id))
}

export function getWorkspaceStats(ws: Workspace) {
  const nodes = canvasNodes(ws)
  return {
    total: nodes.length,
    pending: nodes.filter((n) => n.status === 'pending').length,
    doing: nodes.filter((n) => n.status === 'doing').length,
    done: nodes.filter((n) => n.status === 'done').length,
    high: nodes.filter((n) => n.priority === 'high').length,
  }
}

export function duplicateNode(ws: Workspace, nodeId: string): Workspace {
  if (isRoot(nodeId)) return ws
  const root = getNode(ws, nodeId)
  if (!root) return ws

  const idMap = new Map<string, string>()
  const toClone: MindNode[] = [root]
  for (const id of getDescendantIds(ws, nodeId)) {
    const n = getNode(ws, id)
    if (n) toClone.push(n)
  }
  for (const n of toClone) idMap.set(n.id, newId('node'))

  const offset = 36
  const newNodes: MindNode[] = toClone.map((n) => ({
    ...n,
    id: idMap.get(n.id)!,
    parentId: n.id === nodeId ? n.parentId : idMap.get(n.parentId)!,
    name: n.id === nodeId ? `${n.name}（副本）` : n.name,
    x: n.x + offset,
    y: n.y + offset,
    sortOrder: n.id === nodeId ? nextSortOrder(ws, n.parentId) : n.sortOrder,
  }))

  const newRootId = idMap.get(nodeId)!
  return {
    ...ws,
    nodes: [...ws.nodes, ...newNodes],
    selectedNodeId: newRootId,
  }
}

const LAYOUT_COLS = 3
const LAYOUT_CELL_W = 260
const LAYOUT_CELL_H = 120
const LAYOUT_GAP = 32
const LAYOUT_ORIGIN = 80

export function autoLayoutCanvas(ws: Workspace): Workspace {
  const list = canvasNodes(ws)
  const pos = new Map<string, { x: number; y: number }>()
  list.forEach((n, i) => {
    const col = i % LAYOUT_COLS
    const row = Math.floor(i / LAYOUT_COLS)
    pos.set(n.id, {
      x: LAYOUT_ORIGIN + col * (LAYOUT_CELL_W + LAYOUT_GAP),
      y: LAYOUT_ORIGIN + row * (LAYOUT_CELL_H + LAYOUT_GAP),
    })
  })
  return {
    ...ws,
    nodes: ws.nodes.map((n) => (pos.has(n.id) ? { ...n, ...pos.get(n.id)! } : n)),
  }
}

export function focusViewportOnNode(
  ws: Workspace,
  nodeId: string,
  viewW = 960,
  viewH = 640,
): Workspace {
  const node = getNode(ws, nodeId)
  if (!node || isRoot(nodeId)) return ws
  const zoom = ws.viewport.zoom
  const cx = node.x + node.width / 2
  const cy = node.y + node.height / 2
  return {
    ...ws,
    viewport: {
      zoom,
      tx: viewW / 2 - cx * zoom,
      ty: viewH / 2 - cy * zoom,
    },
  }
}

export function createEmptyWorkspace(name?: string): Workspace {
  const id = newId('ws')
  const today = new Date().toISOString().slice(0, 10)
  return {
    id,
    name: name ?? `梳理 ${today}`,
    rootName: '今日工作梳理',
    selectedNodeId: null,
    filter: 'all',
    searchQuery: '',
    hideCompleted: false,
    viewport: { tx: 0, ty: 0, zoom: 1 },
    nodes: [
      {
        id: ROOT_ID,
        parentId: '',
        name: '今日工作梳理',
        collapsed: false,
        sortOrder: 0,
        priority: 'medium',
        status: 'pending',
        notes: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    ],
  }
}

/** 重置画布视角并尽量居中任务方块 */
export function resetViewport(ws: Workspace): Workspace {
  const nodes = canvasNodes(ws)
  if (nodes.length === 0) {
    return { ...ws, viewport: { tx: 80, ty: 80, zoom: 1 } }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const zoom = 1
  return {
    ...ws,
    viewport: {
      zoom,
      tx: Math.max(40, 480 - cx * zoom),
      ty: Math.max(40, 320 - cy * zoom),
    },
  }
}

export function createDemoWorkspace(): Workspace {
  const ws = createEmptyWorkspace('示例 · 今日梳理')
  let w = updateNode(ws, ROOT_ID, { name: '今日工作梳理' })
  w = addChildNode(w, ROOT_ID, { x: 100, y: 100 })
  const c1 = w.selectedNodeId!
  w = updateNode(w, c1, { name: '今天要推进的事' })
  w = addChildNode(w, c1, { x: 380, y: 90 })
  const t1 = w.selectedNodeId!
  w = updateNode(w, t1, { name: '回复关键邮件', priority: 'high', status: 'doing' })
  w = addChildNode(w, ROOT_ID, { x: 120, y: 280 })
  const c2 = w.selectedNodeId!
  w = updateNode(w, c2, { name: '需要想清楚' })
  w = addChildNode(w, c2, { x: 400, y: 300 })
  w = updateNode(w, w.selectedNodeId!, { name: '这件事的目标是什么？', notes: '写在备注里避免跑偏' })
  return { ...w, selectedNodeId: t1 }
}
