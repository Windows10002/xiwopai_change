import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react'

import type { AppStorage, Workspace } from '@/types'

type Ctx = {
  storage: AppStorage
  setStorage: Dispatch<SetStateAction<AppStorage>>
  workspace: Workspace
  setWorkspace: (updater: SetStateAction<Workspace>) => void
  openEdit: (nodeId: string) => void
}

const WorkspaceContext = createContext<Ctx | null>(null)

export function WorkspaceProvider({
  value,
  children,
}: {
  value: Ctx
  children: ReactNode
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
