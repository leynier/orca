import React, { useEffect, useMemo, useState } from 'react'
import { Files, Search, GitBranch, ListChecks, Cable, PanelLeft, PanelRight } from 'lucide-react'
import { useAppStore } from '@/store'
import { getRepoMapFromState, useActiveWorktree, useRepoById } from '@/store/selectors'
import { cn } from '@/lib/utils'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import type { ActivityBarPosition } from '@/store/slices/editor'
import type { CheckStatus } from '../../../../shared/types'
import { ActivityBarButton, type ActivityBarItem } from './ActivityBarButton'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { findWorktreeById } from '@/store/slices/worktree-helpers'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem
} from '@/components/ui/context-menu'
import FileExplorer from './FileExplorer'
import SourceControl from './SourceControl'
import SearchPanel from './Search'
import ChecksPanel from './ChecksPanel'
import PortsPanel from './PortsPanel'

const MIN_WIDTH = 220
// Why: long file names (e.g. construction drawing sheets, multi-part document
// names) used to be truncated at a hard 500px cap that no drag could exceed.
// We now let the user drag up to nearly the full window width and only keep a
// small reserve so the rest of the app (left sidebar, editor) is not squeezed
// to zero — the practical ceiling still scales with the user's window size.
const MIN_NON_SIDEBAR_AREA = 320
const ABSOLUTE_FALLBACK_MAX_WIDTH = 2000

const ACTIVITY_BAR_SIDE_WIDTH = 40

function branchDisplayName(branch: string): string {
  return branch.replace(/^refs\/heads\//, '')
}

function getActiveChecksStatus(state: ReturnType<typeof useAppStore.getState>): CheckStatus | null {
  const activeWorktree = state.activeWorktreeId
    ? findWorktreeById(state.worktreesByRepo, state.activeWorktreeId)
    : null
  if (!activeWorktree) {
    return null
  }

  const activeRepo = getRepoMapFromState(state).get(activeWorktree.repoId)
  if (!activeRepo) {
    return null
  }

  const branch = branchDisplayName(activeWorktree.branch)
  if (!branch) {
    return null
  }

  const prCacheKey = `${activeRepo.path}::${branch}`
  return state.prCache[prCacheKey]?.data?.checksStatus ?? null
}

const isMac = navigator.userAgent.includes('Mac')
const mod = isMac ? '\u2318' : 'Ctrl+'

const ACTIVITY_ITEMS: ActivityBarItem[] = [
  {
    id: 'explorer',
    icon: Files,
    title: 'Explorer',
    shortcut: `${isMac ? '\u21E7' : 'Shift+'}${mod}E`
  },
  {
    id: 'search',
    icon: Search,
    title: 'Search',
    shortcut: `${isMac ? '\u21E7' : 'Shift+'}${mod}F`
  },
  {
    id: 'source-control',
    icon: GitBranch,
    title: 'Source Control',
    shortcut: `${isMac ? '\u21E7' : 'Shift+'}${mod}G`,
    gitOnly: true
  },
  {
    id: 'checks',
    icon: ListChecks,
    title: 'Checks',
    shortcut: `${isMac ? '\u21E7' : 'Shift+'}${mod}K`,
    gitOnly: true
  },
  {
    id: 'ports',
    icon: Cable,
    title: 'Ports',
    // Why: Ctrl+Shift+I is the DevTools accelerator on Windows/Linux, so this
    // shortcut is macOS-only. On other platforms the tooltip omits it.
    shortcut: isMac ? `\u21E7${mod}I` : '',
    sshOnly: true
  }
]

type RightSidebarProps = {
  /** Physical edge this sidebar is docked to. Drives the inner-edge border,
   *  resize-handle position, useSidebarResize deltaSign, the activity-bar
   *  'side' strip orientation and the toggle icon, so the activity panel
   *  can render on either window edge when the user swaps sidebar sides. */
  side?: 'left' | 'right'
  /** When true the sidebar is anchored at top:0 of the window on the side
   *  where macOS draws its traffic lights, so the internal header reserves
   *  an 80px pad on the left to keep the activity-bar icons clear of the
   *  dots. Width matches the global `.titlebar-traffic-light-pad`
   *  (calc(80px / var(--ui-zoom-factor, 1))) so it scales with UI zoom. */
  reserveTrafficLightPad?: boolean
}

// Why: keep in sync with the `.titlebar-traffic-light-pad` rule in
// src/renderer/src/assets/main.css so the reserved area scales with UI zoom.
const TRAFFIC_LIGHT_PAD_WIDTH = 'calc(80px / var(--ui-zoom-factor, 1))'

function RightSidebarInner({
  side = 'right',
  reserveTrafficLightPad = false
}: RightSidebarProps): React.JSX.Element {
  const activeWorktree = useActiveWorktree()
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const rightSidebarWidth = useAppStore((s) => s.rightSidebarWidth)
  const setRightSidebarWidth = useAppStore((s) => s.setRightSidebarWidth)
  const rightSidebarTab = useAppStore((s) => s.rightSidebarTab)
  const setRightSidebarTab = useAppStore((s) => s.setRightSidebarTab)
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const checksStatus = useAppStore(getActiveChecksStatus)
  const activityBarPosition = useAppStore((s) => s.activityBarPosition)
  const setActivityBarPosition = useAppStore((s) => s.setActivityBarPosition)
  // Why: source control and checks are meaningless for non-git folders.
  // Hide those tabs so the activity bar only shows relevant actions.
  const activeRepo = useRepoById(activeWorktree?.repoId ?? null)
  const isFolder = activeRepo ? isFolderRepo(activeRepo) : false

  // Why: show the Ports tab only when the active worktree belongs to a
  // remote (SSH) repo, not for any global SSH connection. Switching to a
  // local worktree should hide the tab even if SSH sessions are alive.
  const isRemoteWorktree = !!activeRepo?.connectionId
  const hasActiveSshConnection = useAppStore((s) => {
    if (!activeRepo?.connectionId) {
      return false
    }
    const state = s.sshConnectionStates.get(activeRepo.connectionId)
    return state?.status === 'connected'
  })

  // Why: when the SSH connection drops while the user is viewing the Ports
  // panel, hiding the tab immediately would be jarring. Keep it visible
  // during a 30-second grace period, then hide it.
  const isPortsPanelActive = rightSidebarTab === 'ports'
  // Why: graceActiveRef is set synchronously during render (not via useEffect)
  // so that the very first render after disconnect already sees the grace flag,
  // preventing a one-frame flicker to the Explorer tab.
  const graceActiveRef = React.useRef(false)
  const graceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, forceUpdate] = useState(0)

  if (!hasActiveSshConnection && isPortsPanelActive && !graceActiveRef.current) {
    graceActiveRef.current = true
  } else if (graceActiveRef.current && (hasActiveSshConnection || !isPortsPanelActive)) {
    // Why: clear grace when either (a) the SSH session reconnects, or (b) the
    // user navigates away from the Ports tab — no reason to keep it visible
    // once they've moved on.
    graceActiveRef.current = false
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current)
      graceTimerRef.current = null
    }
  }

  const disconnectGraceActive = graceActiveRef.current

  useEffect(() => {
    if (disconnectGraceActive) {
      graceTimerRef.current = setTimeout(() => {
        graceActiveRef.current = false
        graceTimerRef.current = null
        // Why: only reset the tab if the user is still on Ports. If they
        // already navigated to Search/Checks/etc during the grace period,
        // forcing them back to Explorer would be disruptive.
        if (useAppStore.getState().rightSidebarTab === 'ports') {
          setRightSidebarTab('explorer')
        }
        forceUpdate((n) => n + 1)
      }, 30_000)
      return () => {
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current)
          graceTimerRef.current = null
        }
      }
    }
    return undefined
  }, [disconnectGraceActive, setRightSidebarTab])

  const visibleItems = useMemo(
    () =>
      ACTIVITY_ITEMS.filter((item) => {
        if (item.gitOnly && isFolder) {
          return false
        }
        if (item.sshOnly) {
          if (!isRemoteWorktree) {
            return false
          }
          if (!hasActiveSshConnection && !disconnectGraceActive) {
            return false
          }
        }
        return true
      }),
    [isFolder, isRemoteWorktree, hasActiveSshConnection, disconnectGraceActive]
  )

  // If the active tab is hidden (e.g. switched from a git repo to a folder),
  // fall back to the first visible tab.
  const effectiveTab = visibleItems.some((item) => item.id === rightSidebarTab)
    ? rightSidebarTab
    : visibleItems[0].id

  const activityBarSideWidth = activityBarPosition === 'side' ? ACTIVITY_BAR_SIDE_WIDTH : 0
  const maxWidth = useWindowAwareMaxWidth()
  // Why: when the sidebar reserves the macOS traffic-light pad on its left,
  // the activity-bar icons live in the remaining space — so the minimum
  // width has to grow by the pad width or the user can drag the resize
  // handle far enough to clip the rightmost icons (e.g. Checks).
  const minWidth = MIN_WIDTH + (reserveTrafficLightPad ? 80 : 0)
  const { containerRef, onResizeStart } = useSidebarResize<HTMLDivElement>({
    isOpen: rightSidebarOpen,
    width: rightSidebarWidth,
    minWidth,
    maxWidth,
    // Why: when docked right, dragging left grows the sidebar (deltaSign -1);
    // when docked left, dragging right grows it (deltaSign 1). The hook
    // already supports either direction; only the sign needs to flip.
    deltaSign: side === 'right' ? -1 : 1,
    renderedExtraWidth: activityBarSideWidth,
    setWidth: setRightSidebarWidth
  })

  const panelContent = (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden scrollbar-sleek-parent">
      {/* Why: sidebar panels no longer use key={activeWorktreeId} because
          the full unmount/remount cycle on every worktree switch triggered
          an IPC storm (watchWorktree + readDir + git:branchCompare + …)
          that froze the app for seconds on Windows.  Each panel now reacts
          to activeWorktreeId changes via store subscriptions and reset
          effects, keeping the component instance alive across switches. */}
      {/* Why: live agent activity now renders inline inside each workspace
          card (WorktreeCardAgents, toggled by the 'inline-agents' card
          property) rather than in a bottom-docked dashboard panel that
          competed with file Explorer/Search for vertical space. The right
          sidebar is back to tab-only content. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {effectiveTab === 'explorer' && <FileExplorer />}
        {effectiveTab === 'search' && <SearchPanel />}
        {effectiveTab === 'source-control' && <SourceControl />}
        {effectiveTab === 'checks' && <ChecksPanel />}
        {effectiveTab === 'ports' && <PortsPanel />}
      </div>
    </div>
  )

  const activityBarIcons = visibleItems.map((item) => (
    <ActivityBarButton
      key={item.id}
      item={item}
      active={effectiveTab === item.id}
      onClick={() => setRightSidebarTab(item.id)}
      layout={activityBarPosition}
      // Why: the 'side' strip flips edges with the sidebar, so each button
      // needs to know the dock side to render its active marker and tooltip
      // on the window-facing edge (matches VSCode's behavior).
      sidebarSide={side}
      statusIndicator={item.id === 'checks' ? checksStatus : null}
    />
  ))

  // Why: the toggle icon should point toward the panel it controls. When
  // docked right, PanelRight points its filled edge to the right; when
  // docked left, PanelLeft mirrors the affordance correctly.
  const ToggleIcon = side === 'right' ? PanelRight : PanelLeft
  const toggleLabel = `Toggle ${side} sidebar`

  const closeButton = rightSidebarOpen ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="sidebar-toggle mr-1"
          onClick={toggleRightSidebar}
          aria-label={toggleLabel}
        >
          <ToggleIcon size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {`${toggleLabel} (${isMac ? '⌘L' : 'Ctrl+L'})`}
      </TooltipContent>
    </Tooltip>
  ) : null

  return (
    // Why: when docked left, flex-row-reverse mirrors the visual order of
    // the panel and the 'side' activity-bar strip without disturbing DOM
    // order, so screen readers still encounter panel content before the
    // activity bar regardless of physical edge.
    <div
      ref={containerRef}
      className={cn(
        'relative flex-shrink-0 flex',
        side === 'left' ? 'flex-row-reverse' : 'flex-row',
        // Why: overflow-visible is needed when open so the resize handle on
        // the inner edge remains interactive. When closed (width 0), switch
        // to overflow-hidden so the activity bar icons and panel content
        // don't leak past the 0-width boundary (the component stays mounted
        // for performance — see App.tsx).
        rightSidebarOpen ? 'overflow-visible' : 'overflow-hidden'
      )}
    >
      {/* Panel content area */}
      <div
        className="flex flex-col flex-1 min-w-0 bg-sidebar overflow-hidden"
        style={{
          // Why: the panel border lives on the inner edge (the side facing
          // the editor), which flips with the dock side.
          borderLeft:
            rightSidebarOpen && side === 'right' ? '1px solid var(--sidebar-border)' : undefined,
          borderRight:
            rightSidebarOpen && side === 'left' ? '1px solid var(--sidebar-border)' : undefined
        }}
      >
        {activityBarPosition === 'top' ? (
          /* ── Top activity bar: horizontal icon row ── */
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  'flex items-center justify-between border-b border-border h-[42px] min-h-[42px] pr-1',
                  reserveTrafficLightPad ? '' : 'pl-2'
                )}
                style={
                  reserveTrafficLightPad ? { paddingLeft: TRAFFIC_LIGHT_PAD_WIDTH } : undefined
                }
              >
                <TooltipProvider delayDuration={400}>
                  {/* Why: the close/toggle button is grouped with the
                      activity-bar icons rather than pushed to the opposite
                      edge by justify-between. When docked left it sits
                      right before the icons (immediately after the macOS
                      pad if reserved); when docked right it sits right
                      after them. Either way it stays adjacent to the
                      icons it controls. */}
                  {side === 'left' ? (
                    <div className="flex items-center">
                      {closeButton}
                      {activityBarIcons}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center">{activityBarIcons}</div>
                      {closeButton}
                    </>
                  )}
                </TooltipProvider>
              </div>
            </ContextMenuTrigger>
            <ActivityBarPositionMenu
              currentPosition={activityBarPosition}
              onChangePosition={setActivityBarPosition}
            />
          </ContextMenu>
        ) : (
          /* ── Side layout: static title header ── */
          <div
            className={cn(
              'flex items-center justify-between h-[42px] min-h-[42px] pr-3 border-b border-border',
              reserveTrafficLightPad ? '' : 'pl-3'
            )}
            style={reserveTrafficLightPad ? { paddingLeft: TRAFFIC_LIGHT_PAD_WIDTH } : undefined}
          >
            <TooltipProvider delayDuration={400}>
              {/* Why: same inner-edge alignment as the 'top' header — the
                  close button stays next to the panel title regardless of
                  which side the sidebar is docked to. */}
              {side === 'left' ? (
                <div className="flex items-center gap-2">
                  {closeButton}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    {visibleItems.find((item) => item.id === effectiveTab)?.title ?? ''}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    {visibleItems.find((item) => item.id === effectiveTab)?.title ?? ''}
                  </span>
                  {closeButton}
                </>
              )}
            </TooltipProvider>
          </div>
        )}

        {panelContent}

        {/* Resize handle on the inner edge (away from the window border). */}
        <div
          className={cn(
            'absolute top-0 w-1 h-full cursor-col-resize hover:bg-ring/20 active:bg-ring/30 transition-colors z-10',
            side === 'right' ? 'left-0' : 'right-0'
          )}
          onMouseDown={onResizeStart}
        />
      </div>

      {/* Side Activity Bar (icon strip on the outer window edge) — only for 'side' position */}
      {activityBarPosition === 'side' && (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                'flex flex-col items-center w-10 min-w-[40px] bg-sidebar border-border',
                // Why: the strip sits against the outer window edge, so its
                // border faces the panel — flipped with the dock side.
                side === 'right' ? 'border-l' : 'border-r',
                // Why: when the strip hugs the macOS traffic-light corner,
                // push the first icon below the 42px-tall dot row so the
                // dots don't draw on top of it. The 'top' header path
                // doesn't need this because that header itself takes up
                // the same 42px and reserves the pad horizontally.
                reserveTrafficLightPad ? 'pt-[42px]' : ''
              )}
            >
              <TooltipProvider delayDuration={400}>{activityBarIcons}</TooltipProvider>
            </div>
          </ContextMenuTrigger>
          <ActivityBarPositionMenu
            currentPosition={activityBarPosition}
            onChangePosition={setActivityBarPosition}
          />
        </ContextMenu>
      )}
    </div>
  )
}

const RightSidebar = React.memo(RightSidebarInner)
export default RightSidebar

// Why: the drag-resize max is a function of window width, not a constant, so
// users with wide displays can expand the sidebar far enough to read long file
// names. Falls back to a large constant in non-DOM environments (tests).
function useWindowAwareMaxWidth(): number {
  const [max, setMax] = useState(() => computeMaxRightSidebarWidth())

  useEffect(() => {
    function update(): void {
      setMax(computeMaxRightSidebarWidth())
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return max
}

function computeMaxRightSidebarWidth(): number {
  if (typeof window === 'undefined' || !Number.isFinite(window.innerWidth)) {
    return ABSOLUTE_FALLBACK_MAX_WIDTH
  }
  return Math.max(MIN_WIDTH, window.innerWidth - MIN_NON_SIDEBAR_AREA)
}

// ─── Context Menu for Activity Bar Position ───────────
function ActivityBarPositionMenu({
  currentPosition,
  onChangePosition
}: {
  currentPosition: ActivityBarPosition
  onChangePosition: (pos: ActivityBarPosition) => void
}): React.JSX.Element {
  return (
    <ContextMenuContent>
      <ContextMenuLabel>Activity Bar Position</ContextMenuLabel>
      <ContextMenuRadioGroup
        value={currentPosition}
        onValueChange={(v) => onChangePosition(v as ActivityBarPosition)}
      >
        <ContextMenuRadioItem value="top">Top</ContextMenuRadioItem>
        <ContextMenuRadioItem value="side">Side</ContextMenuRadioItem>
      </ContextMenuRadioGroup>
    </ContextMenuContent>
  )
}
