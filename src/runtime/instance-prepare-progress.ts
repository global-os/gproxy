export type PrepareStage =
  | 'starting'
  | 'resolving-image'
  | 'building-snapshot'
  | 'loading-tar'
  | 'extracting-tar'
  | 'ready'
  | 'failed'

export type InstancePrepareStatus = {
  ready: boolean
  stage: PrepareStage
  message: string
  error?: string
}

const statusByInstance = new Map<number, InstancePrepareStatus>()

const DEFAULT_STATUS: InstancePrepareStatus = {
  ready: false,
  stage: 'starting',
  message: 'Preparing app…',
}

export function setInstancePrepareProgress(
  instanceId: number,
  stage: PrepareStage,
  message: string,
): void {
  statusByInstance.set(instanceId, {
    ready: false,
    stage,
    message,
  })
}

export function setInstancePrepareReady(instanceId: number): void {
  statusByInstance.set(instanceId, {
    ready: true,
    stage: 'ready',
    message: 'Ready',
  })
}

export function setInstancePrepareFailed(instanceId: number, error: string): void {
  statusByInstance.set(instanceId, {
    ready: false,
    stage: 'failed',
    message: 'Failed to start app',
    error,
  })
}

export function getInstancePrepareStatus(
  instanceId: number,
  contentCached: boolean,
): InstancePrepareStatus {
  if (contentCached) {
    return {
      ready: true,
      stage: 'ready',
      message: 'Ready',
    }
  }

  return statusByInstance.get(instanceId) ?? DEFAULT_STATUS
}

export function clearInstancePrepareStatus(instanceId: number): void {
  statusByInstance.delete(instanceId)
}