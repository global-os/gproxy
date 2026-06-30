import { ensurePrimaryInstance } from './create-instance.js'
import { requireLaunchableApp, requireWorkspace } from './workspace-access.js'
import { scheduleInstancePrepare } from '../runtime/instance/background.js'
import { createWorkspaceLogWriter } from './workspace-logger.js'
import { findOrCreateProcess } from './process.js'
import {
  createWindow,
  focusWindow,
  listProcessWindows,
  type WorkspaceWindowDto,
} from './window-service.js'
import { db } from '../db/index.js'

export type LaunchResult = {
  processId: number
  instanceId: number | null
  instanceSlug: string
  url: string
  action: 'focus' | 'open'
  window: WorkspaceWindowDto
}

export async function launchProgram(opts: {
  userId: string
  workspaceId: number
  directoryId: number
  directoryName: string
}): Promise<LaunchResult> {
  const { userId, workspaceId, directoryId, directoryName } = opts
  const start = Date.now()
  const log = (step: string) => console.log(`[launch] ${step} +${Date.now() - start}ms`)

  log('start')
  await requireWorkspace(userId, workspaceId)
  log('workspace ok')
  await requireLaunchableApp(userId, directoryId)
  log('app ok')

  const bundleName = directoryName.endsWith('.gapp') ? directoryName : `${directoryName}.gapp`
  const processRow = await findOrCreateProcess(db, workspaceId, directoryId)
  log(`process ${processRow.id}`)
  const { instanceId, instanceSlug, url } = await ensurePrimaryInstance(processRow.id)
  const workspaceLog = createWorkspaceLogWriter(workspaceId)
  await workspaceLog.info('launch', `Launched ${bundleName}`)
  scheduleInstancePrepare(instanceId)
  log(`instance ${instanceSlug}`)

  const existingWindows = await listProcessWindows(workspaceId, processRow.id)
  log(`windows ${existingWindows.length}`)
  const title = bundleName.replace(/\.gapp$/, '')

  if (existingWindows.length > 0) {
    const frontmost = existingWindows[0]
    const focused = (await focusWindow(workspaceId, frontmost.id)) ?? frontmost
    return {
      processId: processRow.id,
      instanceId: focused.instanceId,
      instanceSlug: focused.instanceSlug,
      url: focused.src,
      action: 'focus',
      window: focused,
    }
  }

  const offset = 0
  const opened = await createWindow({
    workspaceId,
    processId: processRow.id,
    instanceId,
    instanceSlug,
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
    instanceSlug,
    url: opened.src,
    action: 'open',
    window: opened,
  }
}

export { LaunchError } from './errors.js'