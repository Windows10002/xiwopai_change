import { Keyboard } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-surface text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Keyboard className="h-5 w-5 text-primary" />
            快捷键与技巧
          </DialogTitle>
        </DialogHeader>
        <ul className="list-inside list-disc space-y-2 text-sm text-muted">
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
              ?
            </kbd>{' '}
            打开本帮助
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
              /
            </kbd>{' '}
            聚焦搜索框
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
              Enter
            </kbd>{' '}
            编辑当前选中任务
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
              Ctrl+D
            </kbd>{' '}
            复制选中节点（含子级）
          </li>
          <li>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
              Delete
            </kbd>{' '}
            删除选中节点
          </li>
          <li>点击画布方块上的状态标签可快速切换：待开始 → 进行中 → 已完成</li>
          <li>点击侧栏节点会自动定位到画布对应方块</li>
          <li>顶栏「排布」一键整理画布位置；「导出/导入」可备份全部梳理方案</li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
