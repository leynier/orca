import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** CSS custom property the worktree sidebar's resize hook writes its live drag
 *  width to. Sibling DOM that lives outside the resized container — like the
 *  worktree cluster painted in a full-width titlebar above the sidebar — reads
 *  this var so it can track the in-flight width without waiting for React
 *  state to settle on mouseup. */
export const WORKTREE_SIDEBAR_LIVE_WIDTH_VAR = '--worktree-sidebar-live-width'

type UseSidebarResizeOptions = {
  isOpen: boolean
  width: number
  minWidth: number
  maxWidth: number
  deltaSign: 1 | -1
  renderedExtraWidth?: number
  setWidth: (width: number) => void
  /** When set, the hook writes the live drag width to this CSS custom property
   *  on document.documentElement and clears it on mouseup. See
   *  WORKTREE_SIDEBAR_LIVE_WIDTH_VAR for the canonical name and rationale. */
  liveWidthCssVar?: string
}

type UseSidebarResizeResult<T extends HTMLElement> = {
  containerRef: React.RefObject<T | null>
  isResizing: boolean
  onResizeStart: (event: React.MouseEvent) => void
}

export function clampSidebarResizeWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(maxWidth, Math.max(minWidth, width))
}

export function getRenderedSidebarWidthCssValue(
  isOpen: boolean,
  width: number,
  renderedExtraWidth: number
): string {
  return isOpen ? `${width + renderedExtraWidth}px` : '0px'
}

export function getNextSidebarResizeWidth({
  clientX,
  startX,
  startWidth,
  deltaSign,
  minWidth,
  maxWidth
}: {
  clientX: number
  startX: number
  startWidth: number
  deltaSign: 1 | -1
  minWidth: number
  maxWidth: number
}): number {
  const delta = (clientX - startX) * deltaSign
  return clampSidebarResizeWidth(startWidth + delta, minWidth, maxWidth)
}

export function useSidebarResize<T extends HTMLElement>({
  isOpen,
  width,
  minWidth,
  maxWidth,
  deltaSign,
  renderedExtraWidth = 0,
  setWidth,
  liveWidthCssVar
}: UseSidebarResizeOptions): UseSidebarResizeResult<T> {
  const containerRef = useRef<T | null>(null)
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)
  const draftWidthRef = useRef(width)
  const frameRef = useRef<number | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  const removeDragOverlay = useCallback(() => {
    const overlay = overlayRef.current
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay)
    }
    overlayRef.current = null
  }, [])

  const resetDocumentStyles = useCallback(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    removeDragOverlay()
  }, [removeDragOverlay])

  const applyRenderedWidth = useCallback(
    (nextWidth: number) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      // Why: sidebar containers intentionally keep live drag width out of
      // React props. Any unrelated rerender during a drag would otherwise
      // snap the DOM width back to the last persisted store value and make the
      // handle feel like it is lagging behind the pointer.
      container.style.width = getRenderedSidebarWidthCssValue(isOpen, nextWidth, renderedExtraWidth)
      if (liveWidthCssVar) {
        document.documentElement.style.setProperty(liveWidthCssVar, `${nextWidth}px`)
      }
    },
    [isOpen, liveWidthCssVar, renderedExtraWidth]
  )

  useLayoutEffect(() => {
    if (isResizingRef.current) {
      return
    }

    draftWidthRef.current = width
    applyRenderedWidth(width)
  }, [applyRenderedWidth, width])

  const stopResize = useCallback(() => {
    if (!isResizingRef.current) {
      return
    }

    isResizingRef.current = false
    setIsResizing(false)

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    resetDocumentStyles()

    const finalWidth = draftWidthRef.current
    applyRenderedWidth(finalWidth)
    if (liveWidthCssVar) {
      // Why: clear the live var on drop so React state takes over again.
      // Leaving it set would keep the sibling DOM pinned to the last drag
      // value even after the store updates with the same number — and an
      // unrelated render that only changed `sidebarWidth` (e.g. via a
      // settings change) would no longer flow through.
      document.documentElement.style.removeProperty(liveWidthCssVar)
    }
    if (finalWidth !== width) {
      setWidth(finalWidth)
    }
  }, [applyRenderedWidth, liveWidthCssVar, resetDocumentStyles, setWidth, width])

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current) {
        return
      }

      const nextWidth = getNextSidebarResizeWidth({
        clientX: event.clientX,
        startX: startXRef.current,
        startWidth: startWidthRef.current,
        deltaSign,
        minWidth,
        maxWidth
      })
      if (nextWidth === draftWidthRef.current) {
        return
      }

      draftWidthRef.current = nextWidth
      if (frameRef.current !== null) {
        return
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        applyRenderedWidth(draftWidthRef.current)
      })
    },
    [applyRenderedWidth, deltaSign, maxWidth, minWidth]
  )

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResize)
    window.addEventListener('blur', stopResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResize)
      window.removeEventListener('blur', stopResize)

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      isResizingRef.current = false
      resetDocumentStyles()
    }
  }, [handleMouseMove, resetDocumentStyles, stopResize])

  const onResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      isResizingRef.current = true
      setIsResizing(true)
      startXRef.current = event.clientX
      startWidthRef.current = width
      draftWidthRef.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      // Why: native plugins like Chromium's PDF <embed> capture pointer events
      // internally, so dragging across them swallows the `mouseup` on the
      // window and the resize never stops — the sidebar ends up following the
      // cursor indefinitely. A full-viewport transparent overlay above all
      // content keeps mouse events flowing to the window listeners for the
      // duration of the drag.
      if (!overlayRef.current) {
        const overlay = document.createElement('div')
        overlay.style.position = 'fixed'
        overlay.style.inset = '0'
        overlay.style.zIndex = '2147483647'
        overlay.style.cursor = 'col-resize'
        overlay.style.background = 'transparent'
        document.body.appendChild(overlay)
        overlayRef.current = overlay
      }
    },
    [width]
  )

  return { containerRef, isResizing, onResizeStart }
}
