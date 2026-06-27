import {
  ensurePrimaryInstance,
  findOrCreateProcess,
} from './create-instance.js'
import { requireLaunchableApp, requireWorkspaceSession } from './session-access.js'
import {
  createWindow,
  focusWindow,
  listProcessWindows,
  type WorkspaceWindowDto,
} from './window-service.js'

export type LaunchResult = {
  processId: number
  instanceId: number
  url: string
  action: 'focus' | 'open'
  window: WorkspaceWindowDto
}

export async function launchProgram(opts: {
  userId: string
  sessionId: number
  directoryId: number
  directoryName: string
}): Promise<LaunchResult> {
  const { userId, sessionId, directoryId, directoryName } = opts
  const start = Date.now()
  const log = (step: string) => console.log(`[launch] ${step} +${Date.now() - start}ms`)

  log('start')
  await requireWorkspaceSession(userId, sessionId)
  log('session ok')
  await requireLaunchableApp(userId, directoryId)
  log('app ok')

  const processRow = await findOrCreateProcess(sessionId, directoryId)
  log(`process ${processRow.id}`)
  const { instanceId, url } = await ensurePrimaryInstance(processRow.id)
  log(`instance ${instanceId}`)

  const existingWindows = await listProcessWindows(sessionId, processRow.id)
  log(`windows ${existingWindows.length}`)

  const bundleName = directoryName.endsWith('.gapp') ? directoryName : `${directoryName}.gapp`
  const title = bundleName.replace(/\.gapp$/, '')

  if (existingWindows.length > 0) {
    const frontmost = existingWindows[0]
    const focused = (await focusWindow(sessionId, frontmost.id)) ?? frontmost
    return {
      processId: processRow.id,
      instanceId: focused.instanceId,
      url: focused.src,
      action: 'focus',
      window: focused,
    }
  }

  const offset = 0
  const opened = await createWindow({
    sessionId,
    processId: processRow.id,
    instanceId,
    title,
    bundleName,
    x: offset,
    y: offset,
    width: 720,
    height: 480,
  })

  return {
    processId: processRow.id,
    instanceId,
    url: opened.src,
    action: 'open',
    window: opened,
  }
}

export { LaunchError } from './errors.js'