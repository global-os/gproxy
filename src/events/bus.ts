/** In-process wake signals so SSE streams can poll immediately after a local publish. */
class WorkspaceEventWakeBus {
  private readonly waiters = new Map<number, Set<() => void>>()

  wait(workspaceId: number, timeoutMs: number): Promise<'wake' | 'timeout'> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.remove(workspaceId, onWake)
        resolve('timeout')
      }, timeoutMs)

      const onWake = () => {
        clearTimeout(timer)
        this.remove(workspaceId, onWake)
        resolve('wake')
      }

      let set = this.waiters.get(workspaceId)
      if (!set) {
        set = new Set()
        this.waiters.set(workspaceId, set)
      }
      set.add(onWake)
    })
  }

  wake(workspaceId: number): void {
    const set = this.waiters.get(workspaceId)
    if (!set) return
    for (const fn of set) fn()
    set.clear()
  }

  private remove(workspaceId: number, fn: () => void): void {
    this.waiters.get(workspaceId)?.delete(fn)
  }
}

export const workspaceEventWakeBus = new WorkspaceEventWakeBus()
