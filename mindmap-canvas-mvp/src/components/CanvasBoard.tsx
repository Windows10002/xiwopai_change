import { useCallback, useEffect, useRef, useState } from 'react'

import { useWorkspace } from '@/context/WorkspaceContext'
import { cn } from '@/lib/utils'
import {
  canvasNodes,
  cycleStatus,
  matchesSearch,
  nodePassesFilters,
  removeNode,
  updateNode,
} from '@/lib/mindTree'
import type { MindNode, TaskPriority, TaskStatus } from '@/types'

const MIN_ZOOM = 0.35
const MAX_ZOOM = 1.8

function priorityBorder(p: TaskPriority) {
  if (p === 'high') return 'border-l-red-500'
  if (p === 'medium') return 'border-l-sky-500'
  return 'border-l-emerald-500'
}

function statusLabel(s: TaskStatus) {
  if (s === 'doing') return '进行中'
  if (s === 'done') return '已完成'
  return '待开始'
}

function statusClass(s: TaskStatus) {
  if (s === 'done') return 'bg-emerald-500/15 text-emerald-400'
  if (s === 'doing') return 'bg-sky-500/15 text-sky-400'
  return 'bg-zinc-500/15 text-zinc-400'
}

export function CanvasBoard() {
  const { workspace, setWorkspace, openEdit } = useWorkspace()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [panning, setPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const dragNode = useRef<{
    id: string
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const { tx, ty, zoom } = workspace.viewport

  const visible = canvasNodes(workspace).filter((n) => nodePassesFilters(workspace, n))
  const searchActive = workspace.searchQuery.trim().length > 0

  const onWheel = useCallback(
    (e: WheelEvent) => {
      const el = wrapRef.current
      if (!el) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      setWorkspace((ws) => {
        const old = ws.viewport
        const z2 = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, old.zoom * factor))
        const wx = (px - old.tx) / old.zoom
        const wy = (py - old.ty) / old.zoom
        return {
          ...ws,
          viewport: { tx: px - wx * z2, ty: py - wy * z2, zoom: z2 },
        }
      })
    },
    [setWorkspace],
  )

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (panning) {
        setWorkspace((ws) => ({
          ...ws,
          viewport: {
            ...ws.viewport,
            tx: panStart.current.tx + (e.clientX - panStart.current.x),
            ty: panStart.current.ty + (e.clientY - panStart.current.y),
          },
        }))
        return
      }
      const d = dragNode.current
      if (!d) return
      const dx = (e.clientX - d.startX) / workspace.viewport.zoom
      const dy = (e.clientY - d.startY) / workspace.viewport.zoom
      setWorkspace((ws) =>
        updateNode(ws, d.id, { x: d.originX + dx, y: d.originY + dy }),
      )
    }
    const onUp = () => {
      setPanning(false)
      dragNode.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [panning, setWorkspace, workspace.viewport.zoom])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
      const id = workspace.selectedNodeId
      if (!id) return
      e.preventDefault()
      setWorkspace((ws) => removeNode(ws, id))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setWorkspace, workspace.selectedNodeId])

  const startPan = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 2) return
    if ((e.target as HTMLElement).dataset.canvasCard) return
    setPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, tx, ty }
    setWorkspace((ws) => ({ ...ws, selectedNodeId: null }))
  }

  const startDragCard = (e: React.MouseEvent, node: MindNode) => {
    if (e.button !== 0) return
    e.stopPropagation()
    dragNode.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: node.x,
      originY: node.y,
    }
    setWorkspace((ws) => ({ ...ws, selectedNodeId: node.id }))
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-0 flex-1 overflow-hidden bg-background"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(48,54,61,0.35) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(48,54,61,0.35) 1px, transparent 1px)
        `,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${tx}px ${ty}px`,
      }}
      onMouseDown={startPan}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${zoom})` }}
      >
        {visible.length === 0 && (
          <div
            className="pointer-events-none absolute flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/80 px-8 py-6 text-center"
            style={{ left: 120, top: 120, width: 320 }}
          >
            <div>
              <p className="text-sm font-medium text-foreground">任务画布</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                在左侧思维导图添加节点，这里会自动出现可拖拽的任务方块
              </p>
            </div>
          </div>
        )}
        {visible.map((node) => {
          const selected = workspace.selectedNodeId === node.id
          const searchHit = searchActive && matchesSearch(node, workspace.searchQuery)
          return (
            <div
              key={node.id}
              data-canvas-card="1"
              role="button"
              tabIndex={0}
              className={cn(
                'absolute cursor-grab rounded-lg border border-border bg-surface shadow-md transition-shadow active:cursor-grabbing',
                'border-l-4',
                priorityBorder(node.priority),
                selected && 'ring-2 ring-primary/60 shadow-lg',
                searchHit && !selected && 'ring-1 ring-primary/40',
              )}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                minHeight: node.height,
              }}
              onMouseDown={(e) => startDragCard(e, node)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                openEdit(node.id)
              }}
            >
              <div className="p-3">
                <p className="text-sm font-medium leading-snug text-foreground">{node.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] transition-colors hover:opacity-80',
                      statusClass(node.status),
                    )}
                    title="点击切换状态"
                    onClick={(e) => {
                      e.stopPropagation()
                      setWorkspace((ws) =>
                        updateNode(ws, node.id, { status: cycleStatus(node.status) }),
                      )
                    }}
                  >
                    {statusLabel(node.status)}
                  </button>
                  <span className="text-[10px] text-muted">
                    {node.priority === 'high' ? '高' : node.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-border bg-surface/90 px-2 py-1 text-[10px] text-muted backdrop-blur-sm">
        滚轮缩放 · 拖移画布 · 双击编辑 · 点击状态标签切换
      </div>
    </div>
  )
}
