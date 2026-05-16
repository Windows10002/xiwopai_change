import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CanvasBoard } from '@/components/CanvasBoard'
import { MindMapTree } from '@/components/MindMapTree'
import { TaskEditDialog } from '@/components/TaskEditDialog'
import { TopToolbar } from '@/components/TopToolbar'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import {
  duplicateNode,
  focusViewportOnNode,
  resetViewport,
} from '@/lib/mindTree'
import {
  getActiveWorkspace,
  loadStorage,
  patchActiveWorkspace,
  persist,
} from '@/lib/storage'
import { ROOT_ID } from '@/types'
import type { AppStorage, Workspace } from '@/types'

function isTypingTarget() {
  const el = document.activeElement
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
}

export default function App() {
  const [storage, setStorage] = useState<AppStorage>(() => loadStorage())
  const [editOpen, setEditOpen] = useState(false)
  const [editNodeId, setEditNodeId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const workspace = useMemo(() => getActiveWorkspace(storage), [storage])

  const setWorkspace = useCallback(
    (updater: Workspace | ((prev: Workspace) => Workspace)) => {
      setStorage((s) => {
        const prev = getActiveWorkspace(s)
        const next = typeof updater === 'function' ? updater(prev) : updater
        return patchActiveWorkspace(s, next)
      })
    },
    [],
  )

  const openEdit = useCallback((nodeId: string) => {
    setEditNodeId(nodeId)
    setEditOpen(true)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => persist(storage), 300)
    return () => window.clearTimeout(t)
  }, [storage])

  const onResetViewport = useCallback(() => {
    setWorkspace((ws) => resetViewport(ws))
  }, [setWorkspace])

  const onFocusSelected = useCallback(() => {
    const id = workspace.selectedNodeId
    if (!id || id === ROOT_ID) return
    setWorkspace((ws) => focusViewportOnNode(ws, id))
  }, [setWorkspace, workspace.selectedNodeId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget()) return

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setHelpOpen(true)
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (e.key === 'Enter' && workspace.selectedNodeId && workspace.selectedNodeId !== ROOT_ID) {
        e.preventDefault()
        openEdit(workspace.selectedNodeId)
        return
      }
      if (e.key === 'Escape') {
        setWorkspace((ws) => ({ ...ws, selectedNodeId: null }))
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const id = workspace.selectedNodeId
        if (id && id !== ROOT_ID) setWorkspace((ws) => duplicateNode(ws, id))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openEdit, setWorkspace, workspace.selectedNodeId])

  const ctxValue = useMemo(
    () => ({
      storage,
      setStorage,
      workspace,
      setWorkspace,
      openEdit,
    }),
    [storage, workspace, setWorkspace, openEdit],
  )

  return (
    <WorkspaceProvider value={ctxValue}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <TopToolbar
          onResetViewport={onResetViewport}
          onFocusSelected={onFocusSelected}
          helpOpen={helpOpen}
          onHelpOpenChange={setHelpOpen}
          searchInputRef={searchInputRef}
        />
        <div className="flex min-h-0 flex-1">
          <MindMapTree />
          <CanvasBoard />
        </div>
        <TaskEditDialog open={editOpen} nodeId={editNodeId} onOpenChange={setEditOpen} />
      </div>
    </WorkspaceProvider>
  )
}
