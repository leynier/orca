import React, { useEffect } from 'react'
import { useAppStore } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import SidebarHeader from './SidebarHeader'
import SidebarNav from './SidebarNav'
import WorktreeList from './WorktreeList'
import SidebarToolbar from './SidebarToolbar'
import WorktreeMetaDialog from './WorktreeMetaDialog'
import DeleteWorktreeDialog from './DeleteWorktreeDialog'
import NonGitFolderDialog from './NonGitFolderDialog'
import RemoveFolderDialog from './RemoveFolderDialog'
import AddRepoDialog from './AddRepoDialog'
import OrcaYamlTrustDialog from './OrcaYamlTrustDialog'

const MIN_WIDTH = 220
const MAX_WIDTH = 500

type SidebarProps = {
  /** Physical edge this sidebar is docked to. Drives resize direction and the
   *  side of the resize handle so the worktree sidebar can render on either
   *  edge of the window when the user swaps sidebar sides. */
  side?: 'left' | 'right'
}

function Sidebar({ side = 'left' }: SidebarProps): React.JSX.Element {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth)
  const repos = useAppStore((s) => s.repos)
  const fetchAllWorktrees = useAppStore((s) => s.fetchAllWorktrees)

  // Fetch worktrees when repos are added/removed
  const repoCount = repos.length
  useEffect(() => {
    if (repoCount > 0) {
      fetchAllWorktrees()
    }
  }, [repoCount, fetchAllWorktrees])

  const { containerRef, onResizeStart } = useSidebarResize<HTMLDivElement>({
    isOpen: sidebarOpen,
    width: sidebarWidth,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    // Why: when docked left, dragging right grows the sidebar (deltaSign 1);
    // when docked right, dragging left grows it (deltaSign -1).
    deltaSign: side === 'left' ? 1 : -1,
    setWidth: setSidebarWidth,
    // Why: in non-workspace + swap=on the worktree cluster lives in the
    // full-width titlebar above the sidebar, sized statically from the
    // store. Mirror the drag width through this CSS var so the cluster
    // (and the back/forward arrows inside it) tracks the sidebar's live
    // width during the drag instead of snapping into place on mouseup.
    liveWidthCssVar: '--worktree-sidebar-live-width'
  })

  return (
    <TooltipProvider delayDuration={400}>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-shrink-0 bg-sidebar flex flex-col overflow-hidden scrollbar-sleek-parent"
        style={{
          // Why: when docked left the seam between this sidebar and the
          // center column is painted by TabGroupSplitLayout's `border-l`.
          // When docked right the center column has no border on that edge,
          // so we paint our own inner-edge border here to separate the
          // worktree list from the editor / terminal pane.
          borderLeft: side === 'right' ? '1px solid var(--sidebar-border)' : undefined
        }}
      >
        {/* Fixed controls */}
        <SidebarNav />
        <SidebarHeader />

        <WorktreeList />

        {/* Fixed bottom toolbar */}
        <SidebarToolbar />

        {/* Resize handle on the inner edge (away from the window border). */}
        <div
          className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} w-1 h-full cursor-col-resize hover:bg-ring/20 active:bg-ring/30 transition-colors z-10`}
          onMouseDown={onResizeStart}
        />
      </div>

      {/* Dialog (rendered outside sidebar to avoid clipping) */}
      <WorktreeMetaDialog />
      <DeleteWorktreeDialog />
      <NonGitFolderDialog />
      <RemoveFolderDialog />
      <AddRepoDialog />
      <OrcaYamlTrustDialog />
    </TooltipProvider>
  )
}

export default React.memo(Sidebar)
