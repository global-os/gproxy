export type KernelMessage = {
  type: string
} & Record<string, unknown>

export type KernelWindowContext = {
  workspaceId: string
  windowId: number
  processId: number
  instanceId: number
  bundleName: string
  title: string
}

export type ActiveOperation = {
  op: 'save'
  windowId: number
}
