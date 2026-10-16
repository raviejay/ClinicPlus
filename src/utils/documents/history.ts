// Undo / redo for the designer. States are plain, immutable snapshots.

export interface History<T> {
  readonly present: T
  readonly canUndo: boolean
  readonly canRedo: boolean
  /**
   * Records a new state. Changes with the same `mergeKey` within `mergeMs` of each other (typing,
   * dragging, nudging with the arrow keys) become a single undo step.
   */
  commit(next: T, mergeKey?: string, now?: number): void
  undo(): T
  redo(): T
  reset(initial: T): void
  /** Ends the current merge window, so the next change is its own undo step (e.g. right after saving) */
  breakMerge(): void
}

export function createHistory<T>(initial: T, limit = 100, mergeMs = 800): History<T> {
  let past: T[] = []
  let future: T[] = []
  let present = initial
  let lastKey: string | null = null
  let lastAt = 0

  return {
    get present() { return present },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },

    commit(next, mergeKey, now = Date.now()) {
      if (Object.is(next, present)) return
      if (mergeKey && mergeKey === lastKey && now - lastAt < mergeMs && past.length > 0) {
        present = next
      } else {
        past.push(present)
        if (past.length > limit) past = past.slice(past.length - limit)
        present = next
      }
      future = []
      lastKey = mergeKey ?? null
      lastAt = now
    },

    undo() {
      if (past.length === 0) return present
      future.push(present)
      present = past.pop() as T
      lastKey = null
      return present
    },

    redo() {
      if (future.length === 0) return present
      past.push(present)
      present = future.pop() as T
      lastKey = null
      return present
    },

    breakMerge() {
      lastKey = null
    },

    reset(next) {
      past = []
      future = []
      present = next
      lastKey = null
    },
  }
}
