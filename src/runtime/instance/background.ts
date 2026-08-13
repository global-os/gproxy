import { AsyncLocalStorage } from 'node:async_hooks'
import { ensureInstanceReady } from './manager.js'
import { getInstancePrepareStatus } from './prepare-progress.js'

type VercelRequestContext = {
  waitUntil?: (promise: Promise<unknown>) => void
}

export const vercelContext = new AsyncLocalStorage<VercelRequestContext>()

export function scheduleInstancePrepare(instanceId: number): void {
  if (getInstancePrepareStatus(instanceId, false).stage === 'failed') return

  const work = ensureInstanceReady(instanceId).catch((err) => {
    console.error(`[instance] prepare failed for ${instanceId}:`, err)
  })

  const ctx = vercelContext.getStore()
  if (ctx?.waitUntil) {
    ctx.waitUntil(work)
  } else {
    void work
  }
}
