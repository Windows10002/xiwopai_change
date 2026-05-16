import type { AppStorage } from '@/types'

export function exportStorageJson(storage: AppStorage): void {
  const blob = new Blob([JSON.stringify(storage, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url
  a.download = `工作梳理备份-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportedStorage(raw: string): AppStorage {
  const parsed = JSON.parse(raw) as AppStorage
  if (!parsed?.workspaces?.length || !parsed.activeWorkspaceId) {
    throw new Error('invalid')
  }
  return parsed
}
