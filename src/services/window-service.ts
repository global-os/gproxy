import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { isLegacyUuidSlug } from '../runtime/instance/slug.js'
import { instancePublicUrl } from '../runtime/urls.js'
import { upgradeLegacySlug } from './create-instance.js'

export type WorkspaceWindowDto = {
  id: number
  workspaceId: number
  processId: number
  instanceId: number | null
  instanceSlug: string
  title: string
  bundleName: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  src: string
  srcdoc?: string | null
}

type WindowJoinedRow = {
  id: number
  workspace_id: number
  process_id: number
  instance_id: number | null
  instance_slug: string | null
  title: string
  bundle_name: string
  x: number
  y: number
  width: number
  height: number
  z_index: number
  srcdoc: string | null
}

async function resolveWindowRows(rows: WindowJoinedRow[]): Promise<WindowJoinedRow[]> {
  const slugByInstance = new Map<number, string>()
  const resolved: WindowJoinedRow[] = []

  for (const row of rows) {
    if (row.instance_id == null) {
      resolved.push(row)
      continue
    }
    let slug = slugByInstance.get(row.instance_id) ?? row.instance_slug ?? ''
    if (!slugByInstance.has(row.instance_id) && isLegacyUuidSlug(slug)) {
      slug = await upgradeLegacySlug(row.instance_id, slug)
    }
    slugByInstance.set(row.instance_id, slug)
    resolved.push({ ...row, instance_slug: slug })
  }

  return resolved
}

function toDto(row: WindowJoinedRow): WorkspaceWindowDto {
  const slug = row.instance_slug ?? ''
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    processId: row.process_id,
    instanceId: row.instance_id,
    instanceSlug: slug,
    title: row.title,
    bundleName: row.bundle_name,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    zIndex: row.z_index,
    src: slug ? instancePublicUrl(slug) : '',
    srcdoc: row.srcdoc,
  }
}

function windowQuery() {
  return db
    .select({
      id: schema.workspaceWindow.id,
      workspace_id: schema.process.workspace_id,
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
      srcdoc: schema.workspaceWindow.srcdoc,
    })
    .from(schema.workspaceWindow)
    .innerJoin(schema.process, eq(schema.workspaceWindow.process_id, schema.process.id))
    .leftJoin(schema.instances, eq(schema.workspaceWindow.instance_id, schema.instances.id))
}

export async function listWorkspaceWindows(workspaceId: number): Promise<WorkspaceWindowDto[]> {
  const rows = await windowQuery()
    .where(eq(schema.process.workspace_id, workspaceId))
    .orderBy(schema.workspaceWindow.z_index)

  return (await resolveWindowRows(rows)).map(toDto)
}

export async function listProcessWindows(
  workspaceId: number,
  processId: number,
): Promise<WorkspaceWindowDto[]> {
  const rows = await windowQuery()
    .where(and(
      eq(schema.process.workspace_id, workspaceId),
      eq(schema.workspaceWindow.process_id, processId),
    ))
    .orderBy(desc(schema.workspaceWindow.z_index))

  return (await resolveWindowRows(rows)).map(toDto)
}

async function nextZIndex(workspaceId: number): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${schema.workspaceWindow.z_index}), 0)` })
    .from(schema.workspaceWindow)
    .innerJoin(schema.process, eq(schema.workspaceWindow.process_id, schema.process.id))
    .where(eq(schema.process.workspace_id, workspaceId))

  return (row?.max ?? 0) + 1
}

export async function createWindow(opts: {
  workspaceId: number
  processId: number
  instanceId?: number | null
  instanceSlug?: string
  title: string
  bundleName: string
  srcdoc?: string | null
  x?: number
  y?: number
  width?: number
  height?: number
}): Promise<WorkspaceWindowDto> {
  const zIndex = await nextZIndex(opts.workspaceId)
  const [row] = await db
    .insert(schema.workspaceWindow)
    .values({
      process_id: opts.processId,
      instance_id: opts.instanceId ?? null,
      title: opts.title,
      bundle_name: opts.bundleName,
      srcdoc: opts.srcdoc ?? null,
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
    workspace_id: opts.workspaceId,
    process_id: opts.processId,
    instance_id: opts.instanceId ?? null,
    instance_slug: opts.instanceSlug ?? null,
    title: opts.title,
    bundle_name: opts.bundleName,
    srcdoc: opts.srcdoc ?? null,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width ?? 720,
    height: opts.height ?? 480,
    z_index: zIndex,
  })
}

export async function focusWindow(
  workspaceId: number,
  windowId: number,
): Promise<WorkspaceWindowDto | null> {
  const zIndex = await nextZIndex(workspaceId)
  const [updated] = await db
    .update(schema.workspaceWindow)
    .set({
      z_index: zIndex,
      last_focused_at: new Date(),
    })
    .where(eq(schema.workspaceWindow.id, windowId))
    .returning({ id: schema.workspaceWindow.id })

  if (!updated) return null

  const [row] = await windowQuery()
    .where(and(
      eq(schema.workspaceWindow.id, windowId),
      eq(schema.process.workspace_id, workspaceId),
    ))
    .limit(1)

  if (!row) return null
  const [resolved] = await resolveWindowRows([row])
  return toDto(resolved)
}

export async function deleteWindow(
  workspaceId: number,
  windowId: number,
): Promise<boolean> {
  const [deleted] = await db
    .delete(schema.workspaceWindow)
    .where(eq(schema.workspaceWindow.id, windowId))
    .returning({ id: schema.workspaceWindow.id, process_id: schema.workspaceWindow.process_id })

  if (!deleted) return false

  const [proc] = await db
    .select({ workspace_id: schema.process.workspace_id })
    .from(schema.process)
    .where(eq(schema.process.id, deleted.process_id))
    .limit(1)

  return proc?.workspace_id === workspaceId
}

export async function updateWindowGeometry(
  workspaceId: number,
  windowId: number,
  patch: { x?: number; y?: number; width?: number; height?: number },
): Promise<void> {
  const [row] = await windowQuery()
    .where(and(
      eq(schema.workspaceWindow.id, windowId),
      eq(schema.process.workspace_id, workspaceId),
    ))
    .limit(1)

  if (!row) return

  await db
    .update(schema.workspaceWindow)
    .set({
      ...(patch.x !== undefined ? { x: patch.x } : {}),
      ...(patch.y !== undefined ? { y: patch.y } : {}),
      ...(patch.width !== undefined ? { width: patch.width } : {}),
      ...(patch.height !== undefined ? { height: patch.height } : {}),
    })
    .where(eq(schema.workspaceWindow.id, windowId))
}