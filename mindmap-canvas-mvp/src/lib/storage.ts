import { createDemoWorkspace, createEmptyWorkspace } from '@/lib/mindTree'
import type { AppStorage, MindNode, Workspace } from '@/types'
import { ROOT_ID } from '@/types'

export const STORAGE_KEY = 'mindmap-prd-v1'

const LEGACY_KEYS = ['smart-work-scheduler-mvp-v1', 'mindmap-canvas-mvp-v1']

function migrateFlatToTree(parsed: Record<string, unknown>): Workspace | null {
  const projects = parsed.projects
  const tasks = parsed.tasks
  if (!Array.isArray(projects) || !Array.isArray(tasks)) return null

  const ws = createEmptyWorkspace(String(parsed.workbenchName ?? '迁移梳理'))
  const nodes: MindNode[] = [...ws.nodes]
  let order = 0

  for (const p of projects as Record<string, unknown>[]) {
    const pid = String(p.id)
    nodes.push({
      id: pid,
      parentId: ROOT_ID,
      name: String(p.name ?? '分类'),
      collapsed: Boolean(p.collapsed),
      sortOrder: order++,
      priority: 'medium',
      status: 'pending',
      notes: '',
      x: 100 + order * 40,
      y: 80 + order * 50,
      width: 220,
      height: 88,
    })
    const taskList = Array.isArray((p as { tasks?: unknown }).tasks)
      ? (p as { tasks: unknown[] }).tasks
      : (tasks as Record<string, unknown>[]).filter((t) => String(t.parentId) === pid)

    let sub = 0
    for (const tr of taskList) {
      const t = tr as Record<string, unknown>
      const tid = String(t.id ?? `task-${sub}`)
      const pos = (t.position ?? {}) as Record<string, unknown>
      let status: MindNode['status'] = 'pending'
      const st = t.status
      if (st === 'doing') status = 'doing'
      if (st === 'done') status = 'done'
      nodes.push({
        id: tid,
        parentId: pid,
        name: String(t.name ?? t.title ?? '事项'),
        collapsed: false,
        sortOrder: sub++,
        priority: (t.priority as MindNode['priority']) ?? 'medium',
        status,
        notes: String(t.notes ?? ''),
        x: Number(t.x ?? pos.x ?? 200),
        y: Number(t.y ?? pos.y ?? 200),
        width: Number(t.width ?? 220),
        height: Number(t.height ?? 88),
      })
    }
  }

  return {
    ...ws,
    nodes,
    selectedNodeId: typeof parsed.selectedTaskId === 'string' ? parsed.selectedTaskId : null,
    searchQuery: '',
    hideCompleted: false,
  }
}

function normalizeWorkspace(raw: unknown): Workspace | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.nodes)) return null
  return {
    id: String(o.id),
    name: String(o.name ?? '梳理'),
    rootName: String(o.rootName ?? '今日工作梳理'),
    nodes: o.nodes as MindNode[],
    selectedNodeId:
      typeof o.selectedNodeId === 'string' || o.selectedNodeId === null
        ? (o.selectedNodeId as string | null)
        : null,
    viewport:
      o.viewport && typeof o.viewport === 'object'
        ? (o.viewport as Workspace['viewport'])
        : { tx: 0, ty: 0, zoom: 1 },
    filter: o.filter === 'high' || o.filter === 'done' ? o.filter : 'all',
    searchQuery: typeof o.searchQuery === 'string' ? o.searchQuery : '',
    hideCompleted: Boolean(o.hideCompleted),
  }
}

export function loadStorage(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppStorage
      if (parsed.workspaces?.length && parsed.activeWorkspaceId) {
        const workspaces = parsed.workspaces
          .map((w) => normalizeWorkspace(w))
          .filter((w): w is Workspace => w !== null)
        if (workspaces.length) {
          return {
            activeWorkspaceId: parsed.activeWorkspaceId,
            workspaces,
          }
        }
      }
    }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key)
      if (!legacy) continue
      const parsed = JSON.parse(legacy) as Record<string, unknown>
      const ws = migrateFlatToTree(parsed)
      if (ws) {
        const storage: AppStorage = { activeWorkspaceId: ws.id, workspaces: [ws] }
        persist(storage)
        return storage
      }
    }
  } catch {
    // fall through
  }
  const demo = createDemoWorkspace()
  return { activeWorkspaceId: demo.id, workspaces: [demo] }
}

export function persist(storage: AppStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

export function getActiveWorkspace(storage: AppStorage): Workspace {
  return storage.workspaces.find((w) => w.id === storage.activeWorkspaceId) ?? storage.workspaces[0]
}

export function patchActiveWorkspace(storage: AppStorage, ws: Workspace): AppStorage {
  return {
    ...storage,
    workspaces: storage.workspaces.map((w) => (w.id === ws.id ? ws : w)),
  }
}
