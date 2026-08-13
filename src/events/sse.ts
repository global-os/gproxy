import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { workspaceEventWakeBus } from './bus.js'
import { listWorkspaceEventsAfter } from './store.js'
import type { WorkspaceEventRecord } from './types.js'

const POLL_MS = 2_000
const HEARTBEAT_MS = 15_000

function formatSseMessage(record: WorkspaceEventRecord): string {
  return [
    `id: ${record.id}`,
    `event: ${record.type}`,
    `data: ${JSON.stringify(record)}`,
    '',
    '',
  ].join('\n')
}

export function createWorkspaceEventStream(
  db: NodePgDatabase<typeof schema>,
  workspaceId: number,
  afterId: number,
  signal: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      let cursor = afterId
      let lastHeartbeat = Date.now()

      try {
        while (!signal.aborted) {
          const events = await listWorkspaceEventsAfter(db, workspaceId, cursor)
          for (const event of events) {
            controller.enqueue(encoder.encode(formatSseMessage(event)))
            cursor = event.id
          }

          const now = Date.now()
          if (now - lastHeartbeat >= HEARTBEAT_MS) {
            controller.enqueue(encoder.encode(': heartbeat\n\n'))
            lastHeartbeat = now
          }

          if (signal.aborted) break
          await workspaceEventWakeBus.wait(workspaceId, POLL_MS)
        }
      } catch (err) {
        controller.error(err)
        return
      }

      controller.close()
    },
  })
}
