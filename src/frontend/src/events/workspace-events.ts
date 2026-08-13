export type ProcessKilledEvent = {
  type: 'process.killed'
  workspaceId: number
  processId: number
  windowIds: number[]
  bundleName: string
}

export type WorkspaceEventRecord = ProcessKilledEvent & {
  id: number
  createdAt: string
}

export type WorkspaceEventHandlers = {
  onProcessKilled?: (event: ProcessKilledEvent) => void
  onEvent?: (event: WorkspaceEventRecord) => void
  onError?: (error: unknown) => void
}

/** Transport abstraction — SSE today; WebSocket can implement the same interface later. */
export type WorkspaceEventTransport = {
  connect: (
    workspaceId: string,
    handlers: WorkspaceEventHandlers,
    options?: { afterId?: number }
  ) => () => void
}

function dispatchEvent(
  record: WorkspaceEventRecord,
  handlers: WorkspaceEventHandlers
) {
  handlers.onEvent?.(record)
  if (record.type === 'process.killed') {
    handlers.onProcessKilled?.(record)
  }
}

export function createSseWorkspaceEventTransport(): WorkspaceEventTransport {
  return {
    connect(workspaceId, handlers, options) {
      const after = options?.afterId ?? 0
      const url = `/api/workspaces/${encodeURIComponent(workspaceId)}/events?after=${after}`
      const source = new EventSource(url, { withCredentials: true })

      source.onmessage = (message) => {
        try {
          const record = JSON.parse(message.data) as WorkspaceEventRecord
          dispatchEvent(record, handlers)
        } catch (err) {
          handlers.onError?.(err)
        }
      }

      for (const type of ['process.killed'] as const) {
        source.addEventListener(type, (message) => {
          try {
            const record = JSON.parse(
              (message as MessageEvent).data
            ) as WorkspaceEventRecord
            dispatchEvent(record, handlers)
          } catch (err) {
            handlers.onError?.(err)
          }
        })
      }

      source.onerror = () => {
        handlers.onError?.(new Error('Workspace event stream disconnected'))
      }

      return () => source.close()
    },
  }
}

export const workspaceEventTransport = createSseWorkspaceEventTransport()
