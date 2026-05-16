import { ChevronRight, Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useCallback, useState, type DragEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn } from '@/lib/utils'
import {
  addChildNode,
  duplicateNode,
  focusViewportOnNode,
  getChildren,
  isRoot,
  matchesSearch,
  nodeVisibleInTree,
  removeNode,
  reorderSibling,
  toggleCollapsed,
  updateNode,
} from '@/lib/mindTree'
import { ROOT_ID } from '@/types'
import type { MindNode } from '@/types'

const INDENT = 16

function statusDot(status: MindNode['status']) {
  if (status === 'done') return 'bg-emerald-500'
  if (status === 'doing') return 'bg-sky-500'
  return 'bg-zinc-500'
}

function TreeRow({
  node,
  depth,
  onAddChild,
}: {
  node: MindNode
  depth: number
  onAddChild: (parentId: string) => void
}) {
  const { workspace, setWorkspace } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.name)
  const [dragOver, setDragOver] = useState<'before' | 'after' | null>(null)

  const selected = workspace.selectedNodeId === node.id
  const children = getChildren(workspace, node.id)
  const hasChildren = children.length > 0
  const isRootNode = isRoot(node.id)
  const visible = nodeVisibleInTree(workspace, node.id)
  if (!visible) return null

  const searchHit =
    workspace.searchQuery.trim() &&
    !isRootNode &&
    matchesSearch(node, workspace.searchQuery)

  const commitRename = () => {
    const name = draft.trim() || (isRootNode ? '今日工作梳理' : '新事项')
    setWorkspace((ws) => updateNode(ws, node.id, { name }))
    setEditing(false)
  }

  const onDragStart = (e: DragEvent) => {
    if (isRootNode) return
    e.dataTransfer.setData('text/node-id', node.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDropOnRow = (e: DragEvent, place: 'before' | 'after') => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    const draggedId = e.dataTransfer.getData('text/node-id')
    if (!draggedId || draggedId === node.id || isRootNode) return
    setWorkspace((ws) => reorderSibling(ws, draggedId, node.id, place))
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-0.5 rounded-md py-0.5 pr-1 transition-colors',
          selected && 'bg-primary/15 ring-1 ring-primary/40',
          dragOver === 'before' && 'border-t-2 border-primary',
          dragOver === 'after' && 'border-b-2 border-primary',
        )}
        style={{ paddingLeft: depth * INDENT + 4 }}
        draggable={!isRootNode}
        onDragStart={onDragStart}
        onDragOver={(e) => {
          if (isRootNode) return
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          setDragOver(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => onDropOnRow(e, dragOver ?? 'after')}
      >
        {!isRootNode && (
          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted opacity-0 group-hover:opacity-100" />
        )}
        <button
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-surface-2"
          onClick={() => setWorkspace((ws) => toggleCollapsed(ws, node.id))}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn('h-3.5 w-3.5 text-muted transition-transform', !node.collapsed && 'rotate-90')}
            />
          ) : (
            <span className="inline-block h-3.5 w-3.5" />
          )}
        </button>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDot(node.status))} />
        {editing ? (
          <input
            autoFocus
            className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className={cn(
              'min-w-0 flex-1 truncate text-left text-xs hover:text-primary',
              searchHit ? 'font-medium text-primary' : 'text-foreground',
            )}
            onClick={() =>
              setWorkspace((ws) =>
                focusViewportOnNode({ ...ws, selectedNodeId: node.id }, node.id),
              )
            }
            onDoubleClick={(e) => {
              e.stopPropagation()
              setDraft(node.name)
              setEditing(true)
            }}
          >
            {node.name}
          </button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
          title="添加子节点"
          onClick={(e) => {
            e.stopPropagation()
            onAddChild(node.id)
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
        {!isRootNode && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
            title="复制节点（含子级）"
            onClick={(e) => {
              e.stopPropagation()
              setWorkspace((ws) => duplicateNode(ws, node.id))
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
        {!isRootNode && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 text-danger opacity-0 group-hover:opacity-100"
            title="删除"
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`删除「${node.name}」及其所有子节点？`)) {
                setWorkspace((ws) => removeNode(ws, node.id))
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {!node.collapsed &&
        children.map((child) => (
          <TreeRow key={child.id} node={child} depth={depth + 1} onAddChild={onAddChild} />
        ))}
    </>
  )
}

export function MindMapTree() {
  const { workspace, setWorkspace } = useWorkspace()
  const root = workspace.nodes.find((n) => n.id === ROOT_ID)

  const handleAddChild = useCallback(
    (parentId: string) => {
      setWorkspace((ws) => addChildNode(ws, parentId))
    },
    [setWorkspace],
  )

  if (!root) return null

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">思维导图</p>
        <p className="mt-0.5 text-[11px] text-muted">双击改名 · 拖动手柄调整同级顺序</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <TreeRow node={root} depth={0} onAddChild={handleAddChild} />
        </div>
      </ScrollArea>
    </aside>
  )
}
