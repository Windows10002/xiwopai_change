import { useWorkspace } from '@/context/WorkspaceContext'
import { getWorkspaceStats } from '@/lib/mindTree'

export function WorkspaceStats() {
  const { workspace } = useWorkspace()
  const s = getWorkspaceStats(workspace)
  if (s.total === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
      <span className="rounded-md border border-border bg-background px-2 py-0.5 text-muted">
        共 <strong className="text-foreground">{s.total}</strong> 项
      </span>
      <span className="rounded-md border border-border bg-zinc-500/10 px-2 py-0.5 text-zinc-400">
        待开始 {s.pending}
      </span>
      <span className="rounded-md border border-border bg-sky-500/10 px-2 py-0.5 text-sky-400">
        进行中 {s.doing}
      </span>
      <span className="rounded-md border border-border bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
        已完成 {s.done}
      </span>
      {s.high > 0 && (
        <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-400">
          高优 {s.high}
        </span>
      )}
    </div>
  )
}
