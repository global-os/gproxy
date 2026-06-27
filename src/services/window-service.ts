import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { instancePublicUrl } from '../runtime/constants.js'
import { isLegacyUuidSlug } from '../runtime/instance-slug.js'
import { upgradeLegacySlug } from './create-instance.js'

export type WorkspaceWindowDto = {
  id: number
  sessionId: number
  processId: number
  instanceId: number
  instanceSlug: string
  title: string
  bundleName: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  src: string
}

type WindowJoinedRow = {
  id: number
  session_id: number
  process_id: number
  instance_id: number
  instance_slug: string
  title: string
  bundle_name: string
  x: number
  y: number
  width: number
  height: number
  z_index: number
}

async function resolveWindowRows(rows: WindowJoinedRow[]): Promise<WindowJoinedRow[]> {
  const slugByInstance = new Map<number, string>()
  const resolved: WindowJoinedRow[] = []

  for (const row of rows) {
    let slug = slugByInstance.get(row.instance_id) ?? row.instance_slug
    if (!slugByInstance.has(row.instance_id) && isLegacyUuidSlug(slug)) {
      slug = await upgradeLegacySlug(row.instance_id, slug)
    }
    slugByInstance.set(row.instance_id, slug)
    resolved.push({ ...row, instance_slug: slug })
  }

  return resolved
}

function toDto(row: WindowJoinedRow): WorkspaceWindowDto {
  return {
    id: row.id,
    sessionId: row.session_id,
    processId: row.process_id,
    instanceId: row.instance_id,
    instanceSlug: row.instance_slug,
    title: row.title,
    bundleName: row.bundle_name,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    zIndex: row.z_index,
    src: instancePublicUrl(row.instance_slug),
  }
}

function windowQuery() {
  return db
    .select({
      id: schema.workspaceWindow.id,
      session_id: schema.workspaceWindow.session_id,
      process_id: schema.workspaceWindow.process_id,
      instance_id: schema.workspaceWindow.instance_id,
      instance_slug: schema.instances.slug,
      title: schema.workspaceWindow.title,
      bundle_name: schema.workspaceWindow.bundle_name,
      x: schema.workspaceWindow.x,
      y: schema.workspaceWindow.y,
      width: schema.workspaceWindow.width,
      height: schema.workspaceWindow.height,
      z_index: schema.workspaceWindow.z_index,
    })
    .from(schema.workspaceWindow)
    .innerJoin(schema.instances, eq(schema.workspaceWindow.instance_id, schema.instances.id))
}

export async function listSessionWindows(sessionId: number): Promise<WorkspaceWindowDto[]> {
  const rows = await windowQuery()
    .where(eq(schema.workspaceWindow.session_id, sessionId))
    .orderBy(schema.workspaceWindow.z_index)

  return (await resolveWindowRows(rows)).map(toDto)
}

export async function listProcessWindows(
  sessionId: number,
  processId: number,
): Promise<WorkspaceWindowDto[]> {
  const rows = await windowQuery()
    .where(and(
      eq(schema.workspaceWindow.session_id, sessionId),
      eq(schema.workspaceWindow.process_id, processId),
    ))
    .orderBy(desc(schema.workspaceWindow.z_index))

  return (await resolveWindowRows(rows)).map(toDto)
}

async function nextZIndex(sessionId: number): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${schema.workspaceWindow.z_index}), 0)` })
    .from(schema.workspaceWindow)
    .where(eq(schema.workspaceWindow.session_id, sessionId))

  return (row?.max ?? 0) + 1
}

export async function createWindow(opts: {
  sessionId: number
  processId: number
  instanceId: number
  instanceSlug: string
  title: string
  bundleName: string
  x?: number
  y?: number
  width?: number
  height?: number
}): Promise<WorkspaceWindowDto> {
  const zIndex = await nextZIndex(opts.sessionId)
  const [row] = await db
    .insert(schema.workspaceWindow)
    .values({
      session_id: opts.sessionId,
      process_id: opts.processId,
      instance_id: opts.instanceId,
      title: opts.title,
      bundle_name: opts.bundleName,
      x: opts.x ?? 0,
      y: opts.y ?? 0,
      width: opts.width ?? 720,
      height: opts.height ?? 480,
      z_index: zIndex,
      last_focused_at: new Date(),
    })
    .returning({ id: schema.workspaceWindow.id })

  return toDto({
    id: row.id,
    session_id: opts.sessionId,
    process_id: opts.processId,
    instance_id: opts.instanceId,
    instance_slug: opts.instanceSlug,
    title: opts.title,
    bundle_name: opts.bundleName,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width ?? 720,
    height: opts.height ?? 480,
    z_index: zIndex,
  })
}

export async function focusWindow(sessionId: number, windowId: number): Promise<WorkspaceWindowDto | null> {
  const zIndex = await nextZIndex(sessionId)
  const [updated] = await db
    .update(schema.workspaceWindow)
    .set({
      z_index: zIndex,
      last_focused_at: new Date(),
    })
    .where(and(
      eq(schema.workspaceWindow.id, windowId),
      eq(schema.workspaceWindow.session_id, sessionId),
    ))
    .returning({ id: schema.workspaceWindow.id })

  if (!updated) return null

  const [row] = await windowQuery()
    .where(and(
      eq(schema.workspaceWindow.id, windowId),
      eq(schema.workspaceWindow.session_id, sessionId),
    ))
    .limit(1)

  if (!row) return null
  const [resolved] = await resolveWindowRows([row])
  return toDto(resolved)
}

export async function updateWindowGeometry(
  sessionId: number,
  windowId: number,
  patch: { x?: number; y?: number; width?: number; height?: number },
): Promise<void> {
  await db
    .update(schema.workspaceWindow)
    .set({
      ...(patch.x !== undefined ? { x: patch.x } : {}),
      ...(patch.y !== undefined ? { y: patch.y } : {}),
      ...(patch.width !== undefined ? { width: patch.width } : {}),
      ...(patch.height !== undefined ? { height: patch.height } : {}),
    })
    .where(and(
      eq(schema.workspaceWindow.id, windowId),
      eq(schema.workspaceWindow.session_id, sessionId),
    ))
}