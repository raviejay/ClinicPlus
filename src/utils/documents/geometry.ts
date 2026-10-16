// Moving, resizing, aligning and snapping elements on the page. Pure functions in millimetres.

export interface Rect { x: number; y: number; w: number; h: number }
export interface Size { w: number; h: number }
export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export const MIN_SIZE = 2

const round = (v: number) => Math.round(v * 100) / 100

export function snap(value: number, grid: number): number {
  return grid > 0 ? Math.round(value / grid) * grid : value
}

/** Keeps at least `keep` mm of an element on the page so it can't be lost off the edge */
export function clampOnPage(r: Rect, page: Size, keep = 4): Rect {
  const k = Math.min(keep, r.w, r.h)
  return {
    ...r,
    x: round(Math.min(page.w - k, Math.max(-(r.w - k), r.x))),
    y: round(Math.min(page.h - k, Math.max(-(r.h - k), r.y))),
  }
}

export function moveRect(r: Rect, dx: number, dy: number, o: { grid?: number; page: Size }): Rect {
  const grid = o.grid ?? 0
  return clampOnPage({ ...r, x: snap(r.x + dx, grid), y: snap(r.y + dy, grid) }, o.page)
}

/** Drags one handle by (dx, dy); the opposite edges stay put, and the box never shrinks below `min` */
export function resizeRect(r: Rect, handle: Handle, dx: number, dy: number, o: { grid?: number; min?: number } = {}): Rect {
  const grid = o.grid ?? 0
  const min = o.min ?? MIN_SIZE
  let left = r.x
  let top = r.y
  let right = r.x + r.w
  let bottom = r.y + r.h

  if (handle.includes('w')) left = snap(left + dx, grid)
  if (handle.includes('e')) right = snap(right + dx, grid)
  if (handle.includes('n')) top = snap(top + dy, grid)
  if (handle.includes('s')) bottom = snap(bottom + dy, grid)

  if (right - left < min) {
    if (handle.includes('w')) left = right - min
    else right = left + min
  }
  if (bottom - top < min) {
    if (handle.includes('n')) top = bottom - min
    else bottom = top + min
  }
  return { x: round(left), y: round(top), w: round(right - left), h: round(bottom - top) }
}

export type AlignTo = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/** Aligns an element to the page (inside the margin for left/right/top/bottom) */
export function alignRect(r: Rect, page: Size, how: AlignTo, margin = 0): Rect {
  switch (how) {
    case 'left': return { ...r, x: round(margin) }
    case 'right': return { ...r, x: round(page.w - margin - r.w) }
    case 'center': return { ...r, x: round((page.w - r.w) / 2) }
    case 'top': return { ...r, y: round(margin) }
    case 'bottom': return { ...r, y: round(page.h - margin - r.h) }
    case 'middle': return { ...r, y: round((page.h - r.h) / 2) }
  }
}

export interface Guide { axis: 'x' | 'y'; at: number }

/**
 * Snaps a moving element's edges and centre to other elements and to the page edges, centre and
 * margins, when they are within `threshold` mm. Returns the guide lines to draw.
 */
export function snapToGuides(
  r: Rect,
  others: Rect[],
  page: Size,
  margin: number,
  threshold = 1.2,
): { rect: Rect; guides: Guide[] } {
  const xTargets = [0, page.w / 2, page.w, margin, page.w - margin]
  const yTargets = [0, page.h / 2, page.h, margin, page.h - margin]
  for (const o of others) {
    xTargets.push(o.x, o.x + o.w / 2, o.x + o.w)
    yTargets.push(o.y, o.y + o.h / 2, o.y + o.h)
  }

  const best = (points: number[], targets: number[]) => {
    let delta: number | null = null
    let at = 0
    for (const p of points) {
      for (const t of targets) {
        const d = t - p
        if (Math.abs(d) <= threshold && (delta === null || Math.abs(d) < Math.abs(delta))) {
          delta = d
          at = t
        }
      }
    }
    return delta === null ? null : { delta, at }
  }

  const sx = best([r.x, r.x + r.w / 2, r.x + r.w], xTargets)
  const sy = best([r.y, r.y + r.h / 2, r.y + r.h], yTargets)
  const guides: Guide[] = []
  const rect = { ...r }
  if (sx) { rect.x = round(r.x + sx.delta); guides.push({ axis: 'x', at: round(sx.at) }) }
  if (sy) { rect.y = round(r.y + sy.delta); guides.push({ axis: 'y', at: round(sy.at) }) }
  return { rect, guides }
}

export function nudgeRect(r: Rect, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown', big: boolean, page: Size): Rect {
  const step = big ? 5 : 1
  const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0
  const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0
  return clampOnPage({ ...r, x: round(r.x + dx), y: round(r.y + dy) }, page)
}
