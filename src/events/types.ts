export type ProcessKilledEvent = {
  type: 'process.killed'
  workspaceId: number
  processId: number
  windowIds: number[]
  bundleName: string
}

export type WorkspaceEventPayload = ProcessKilledEvent

export type WorkspaceEventRecord = WorkspaceEventPayload & {
  id: number
  createdAt: string
}
