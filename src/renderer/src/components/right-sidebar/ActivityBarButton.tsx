import React from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { RightSidebarTab } from '@/store/slices/editor'
import type { CheckStatus } from '../../../../shared/types'

export type ActivityBarItem = {
  id: RightSidebarTab
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  shortcut: string
  /** When true, hidden for non-git (folder-mode) repos. */
  gitOnly?: boolean
  /** When true, only shown when at least one SSH connection is active. */
  sshOnly?: boolean
}

// ─── Status indicator dot color mapping ──────
const STATUS_DOT_COLOR: Record<CheckStatus, string> = {
  success: 'bg-emerald-500',
  failure: 'bg-rose-500',
  pending: 'bg-amber-500',
  neutral: 'bg-muted-foreground'
}

// ─── Activity Bar Button (shared for top + side) ──────
export function ActivityBarButton({
  item,
  active,
  onClick,
  layout,
  sidebarSide,
  statusIndicator
}: {
  item: ActivityBarItem
  active: boolean
  onClick: () => void
  layout: 'top' | 'side'
  /** Physical edge the parent sidebar is docked to. Only relevant for the
   *  'side' layout — drives which edge the active marker / tooltip render
   *  on so they always face the editor (not the window border). */
  sidebarSide: 'left' | 'right'
  statusIndicator?: CheckStatus | null
}): React.JSX.Element {
  const Icon = item.icon
  const isTop = layout === 'top'
  // Why: when the activity bar is in the side strip, the strip sits flush
  // against the outer window edge, so the active-tab marker and the tooltip
  // should render on the side opposite the panel content (i.e. facing the
  // editor). When docked left the strip is on the user's left, so the
  // marker hugs the right edge of each icon and the tooltip opens to the
  // right; mirrored when docked right.
  const isStripOnLeft = !isTop && sidebarSide === 'left'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'relative flex items-center justify-center transition-colors',
            isTop ? 'h-[42px] w-9' : 'w-10 h-10',
            active ? 'text-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'
          )}
          onClick={onClick}
          aria-label={item.shortcut ? `${item.title} (${item.shortcut})` : item.title}
        >
          <Icon size={isTop ? 16 : 18} />

          {/* Status indicator dot */}
          {statusIndicator && statusIndicator !== 'neutral' && (
            <div
              className={cn(
                'absolute rounded-full size-[7px] ring-1 ring-sidebar',
                isTop ? 'top-[8px] right-[5px]' : 'top-[7px] right-[7px]',
                STATUS_DOT_COLOR[statusIndicator] ?? 'bg-muted-foreground'
              )}
            />
          )}

          {/* Active indicator */}
          {active && isTop && (
            <div className="absolute bottom-0 left-[25%] right-[25%] h-[2px] bg-foreground rounded-t" />
          )}
          {active && !isTop && (
            <div
              className={cn(
                'absolute top-[25%] bottom-[25%] w-[2px] bg-foreground',
                isStripOnLeft ? 'left-0 rounded-r' : 'right-0 rounded-l'
              )}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={isTop ? 'bottom' : isStripOnLeft ? 'right' : 'left'} sideOffset={6}>
        {item.shortcut ? `${item.title} (${item.shortcut})` : item.title}
      </TooltipContent>
    </Tooltip>
  )
}
