import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { LaunchError } from './errors.js'

export async function requireWorkspaceSession(userId: string, sessionId: number) {
  const [row] = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(and(
      eq(schema.sessions.id, sessionId),
      eq(schema.sessions.user_id, userId),
    ))
    .limit(1)

  if (!row) {
    throw new LaunchError('Workspace session not found', 404)
  }

  return row
}

export async function deleteWorkspaceSession(userId: string, sessionId: number): Promise<void> {
  await requireWorkspaceSession(userId, sessionId)

  const processes = await db
    .select({ id: schema.process.id })
    .from(schema.process)
    .where(eq(schema.process.session_id, sessionId))

  const processIds = processes.map((row) => row.id)

  await db
    .delete(schema.workspaceWindow)
    .where(eq(schema.workspaceWindow.session_id, sessionId))

  if (processIds.length > 0) {
    await db
      .delete(schema.instances)
      .where(inArray(schema.instances.process_id, processIds))
    await db
      .delete(schema.process)
      .where(eq(schema.process.session_id, sessionId))
  }

  await db
    .delete(schema.sessions)
    .where(and(
      eq(schema.sessions.id, sessionId),
      eq(schema.sessions.user_id, userId),
    ))
}

export async function requireLaunchableApp(userId: string, directoryId: number) {
  const [appDir] = await db
    .select({ id: schema.directory.id, name: schema.directory.name })
    .from(schema.directory)
    .where(and(
      eq(schema.directory.id, directoryId),
      eq(schema.directory.user_id, userId),
    ))
    .limit(1)

  if (!appDir) {
    throw new LaunchError('App not found on desktop', 404)
  }

  if (!appDir.name.endsWith('.gapp')) {
    throw new LaunchError('Only .gapp bundles can be launched', 400)
  }

  return appDir
}