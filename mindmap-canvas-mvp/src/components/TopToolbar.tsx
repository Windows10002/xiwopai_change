import {
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  EyeOff,
  FilePlus,
  Focus,
  HelpCircle,
  LayoutGrid,
  ListFilter,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'

import { HelpDialog } from '@/components/HelpDialog'
import { WorkspaceStats } from '@/components/WorkspaceStats'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkspace } from '@/context/WorkspaceContext'
import { exportStorageJson, parseImportedStorage } from '@/lib/backup'
import {
  autoLayoutCanvas,
  createEmptyWorkspace,
  duplicateNode,
  setAllCollapsed,
} from '@/lib/mindTree'
import { persist } from '@/lib/storage'
import type { DisplayFilter } from '@/types'
import { ROOT_ID } from '@/types'

export function TopToolbar({
  onResetViewport,
  onFocusSelected,
  helpOpen,
  onHelpOpenChange,
  searchInputRef,
}: {
  onResetViewport: () => void
  onFocusSelected: () => void
  helpOpen: boolean
  onHelpOpenChange: (open: boolean) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}) {
  const { storage, setStorage, workspace, setWorkspace } = useWorkspace()
  const importRef = useRef<HTMLInputElement>(null)

  const anyExpanded = workspace.nodes.some((n) => n.id !== ROOT_ID && !n.collapsed)

  const newWorkspace = () => {
    if (
      workspace.nodes.length > 1 &&
      !window.confirm('新建梳理将创建空白方案（当前方案会保留），是否继续？')
    ) {
      return
    }
    const ws = createEmptyWorkspace()
    setStorage((s) => ({
      ...s,
      activeWorkspaceId: ws.id,
      workspaces: [...s.workspaces, ws],
    }))
  }

  const deleteWorkspace = () => {
    if (storage.workspaces.length <= 1) {
      window.alert('至少保留一份梳理方案。')
      return
    }
    if (!window.confirm(`删除「${workspace.name}」？此操作不可恢复。`)) return
    setStorage((s) => {
      const workspaces = s.workspaces.filter((w) => w.id !== workspace.id)
      return {
        activeWorkspaceId: workspaces[0]!.id,
        workspaces,
      }
    })
  }

  const switchWorkspace = (id: string) => {
    setStorage((s) => ({ ...s, activeWorkspaceId: id }))
  }

  const setFilter = (filter: DisplayFilter) => {
    setWorkspace((ws) => ({ ...ws, filter }))
  }

  const renameActive = (name: string) => {
    setWorkspace((ws) => ({ ...ws, name: name.trim() || ws.name }))
  }

  const duplicateSelected = () => {
    const id = workspace.selectedNodeId
    if (!id || id === ROOT_ID) {
      window.alert('请先在侧栏或画布选中要复制的节点。')
      return
    }
    setWorkspace((ws) => duplicateNode(ws, id))
  }

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = parseImportedStorage(String(reader.result))
        setStorage(next)
        persist(next)
      } catch {
        window.alert('导入失败：请选择本应用导出的 JSON 备份文件。')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <>
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFile}
      />
      <header className="shrink-0 border-b border-border bg-surface">
        <div className="flex h-11 flex-wrap items-center gap-2 px-3">
          <span className="text-sm font-semibold text-foreground">工作梳理</span>

          <Select value={storage.activeWorkspaceId} onValueChange={switchWorkspace}>
            <SelectTrigger className="h-8 w-[140px] border-border bg-background text-xs text-foreground">
              <SelectValue placeholder="选择梳理" />
            </SelectTrigger>
            <SelectContent className="border-border bg-surface text-foreground">
              {storage.workspaces.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            className="h-8 max-w-[120px] rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            value={workspace.name}
            onChange={(e) => renameActive(e.target.value)}
            title="当前梳理方案名称"
          />

          <div className="mx-0.5 h-5 w-px bg-border" />

          <Button type="button" size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={newWorkspace}>
            <FilePlus className="h-3.5 w-3.5" />
            新建
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 text-xs"
            onClick={() => setWorkspace((ws) => autoLayoutCanvas(ws))}
            title="自动整理画布方块位置"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            排布
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-8 gap-1 text-xs" onClick={onResetViewport}>
            <Focus className="h-3.5 w-3.5" />
            重置视角
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={onFocusSelected}>
            <Focus className="h-3.5 w-3.5 rotate-45" />
            定位选中
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            onClick={() => setWorkspace((ws) => setAllCollapsed(ws, anyExpanded))}
          >
            {anyExpanded ? (
              <>
                <ChevronsDownUp className="h-3.5 w-3.5" />
                折叠
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                展开
              </>
            )}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={duplicateSelected}>
            <Copy className="h-3.5 w-3.5" />
            复制
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <ListFilter className="h-3.5 w-3.5 text-muted" />
            <Select value={workspace.filter} onValueChange={(v) => setFilter(v as DisplayFilter)}>
              <SelectTrigger className="h-8 w-[108px] border-border bg-background text-xs text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface text-foreground">
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="high">高优先级</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant={workspace.hideCompleted ? 'default' : 'ghost'}
              className="h-8 gap-1 text-xs"
              title="隐藏已完成"
              onClick={() => setWorkspace((ws) => ({ ...ws, hideCompleted: !ws.hideCompleted }))}
            >
              <EyeOff className="h-3.5 w-3.5" />
              藏完成
            </Button>
            <Button type="button" size="sm" variant="secondary" className="h-8 px-2 text-xs" onClick={() => exportStorageJson(storage)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="secondary" className="h-8 px-2 text-xs" onClick={() => importRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
            </Button>
            {storage.workspaces.length > 1 && (
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs text-danger" onClick={deleteWorkspace}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => onHelpOpenChange(true)}>
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
          <input
            ref={searchInputRef}
            className="h-7 min-w-[140px] flex-1 max-w-xs rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
            placeholder="搜索名称或备注…"
            value={workspace.searchQuery}
            onChange={(e) => setWorkspace((ws) => ({ ...ws, searchQuery: e.target.value }))}
          />
          <WorkspaceStats />
        </div>
      </header>
      <HelpDialog open={helpOpen} onOpenChange={onHelpOpenChange} />
    </>
  )
}
