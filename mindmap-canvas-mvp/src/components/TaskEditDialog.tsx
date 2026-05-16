import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkspace } from '@/context/WorkspaceContext'
import { getNode, updateNode } from '@/lib/mindTree'
import type { MindNode, TaskPriority, TaskStatus } from '@/types'

interface TaskEditDialogProps {
  open: boolean
  nodeId: string | null
  onOpenChange: (open: boolean) => void
}

function NodeEditForm({ node, onClose }: { node: MindNode; onClose: () => void }) {
  const { setWorkspace } = useWorkspace()
  const [name, setName] = useState(node.name)
  const [priority, setPriority] = useState<TaskPriority>(node.priority)
  const [status, setStatus] = useState<TaskStatus>(node.status)
  const [notes, setNotes] = useState(node.notes)

  const save = () => {
    if (!name.trim()) return
    setWorkspace((ws) =>
      updateNode(ws, node.id, {
        name: name.trim(),
        priority,
        status,
        notes,
      }),
    )
    onClose()
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="name">任务名称</Label>
        <Input
          id="name"
          className="border-border bg-background text-foreground"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>优先级</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
          <SelectTrigger className="border-border bg-background text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border bg-surface text-foreground">
            <SelectItem value="low">低（绿边框）</SelectItem>
            <SelectItem value="medium">中（蓝边框）</SelectItem>
            <SelectItem value="high">高（红边框）</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>执行状态</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
          <SelectTrigger className="border-border bg-background text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border bg-surface text-foreground">
            <SelectItem value="pending">待开始</SelectItem>
            <SelectItem value="doing">进行中</SelectItem>
            <SelectItem value="done">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">备注详情</Label>
        <textarea
          id="notes"
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="思路、步骤、注意事项"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button type="button" onClick={save}>
          保存
        </Button>
      </div>
    </div>
  )
}

export function TaskEditDialog({ open, nodeId, onOpenChange }: TaskEditDialogProps) {
  const { workspace } = useWorkspace()
  const node = nodeId ? getNode(workspace, nodeId) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">编辑任务</DialogTitle>
        </DialogHeader>
        {!node ? (
          <p className="text-sm text-muted">未找到该任务。</p>
        ) : (
          <NodeEditForm key={node.id} node={node} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
