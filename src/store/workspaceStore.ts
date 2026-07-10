import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceState {
  currentWorkspaceId: string | null
  setWorkspace: (id: string | null) => void
}

// Remembers the active workspace across reloads. The id is validated against
// the user's memberships on load (see useWorkspaces).
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      setWorkspace: (id) => set({ currentWorkspaceId: id }),
    }),
    { name: 'nova.workspace' }
  )
)
