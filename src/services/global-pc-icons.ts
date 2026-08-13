import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  isResourceIconPath,
  normalizeResourceIconPath,
} from '../gapp/icon-ids.js'
import * as schema from '../db/schema.js'
import { resolveGappIconPath } from './gapp-metadata.js'

export async function getGlobalPcIconMap(
  db: NodePgDatabase<typeof schema>,
  globalPcId: number
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      entry_name: schema.globalPcIcon.entry_name,
      icon_id: schema.globalPcIcon.icon_id,
    })
    .from(schema.globalPcIcon)
    .where(eq(schema.globalPcIcon.global_pc_id, globalPcId))

  const map: Record<string, string> = {}
  for (const row of rows) {
    const iconPath = normalizeResourceIconPath(row.icon_id)
    if (iconPath) {
      map[row.entry_name] = iconPath
    }
  }
  return map
}

export async function setGlobalPcIconIfAbsent(
  db: NodePgDatabase<typeof schema>,
  globalPcId: number,
  entryName: string,
  iconPath: string
): Promise<void> {
  if (!isResourceIconPath(iconPath)) return

  await db
    .insert(schema.globalPcIcon)
    .values({
      global_pc_id: globalPcId,
      entry_name: entryName,
      icon_id: iconPath,
    })
    .onConflictDoNothing({
      target: [
        schema.globalPcIcon.global_pc_id,
        schema.globalPcIcon.entry_name,
      ],
    })
}

export async function setGlobalPcIcon(
  db: NodePgDatabase<typeof schema>,
  globalPcId: number,
  entryName: string,
  iconPath: string
): Promise<void> {
  if (!isResourceIconPath(iconPath)) {
    throw new Error('Invalid icon path')
  }

  await db
    .insert(schema.globalPcIcon)
    .values({
      global_pc_id: globalPcId,
      entry_name: entryName,
      icon_id: iconPath,
    })
    .onConflictDoUpdate({
      target: [
        schema.globalPcIcon.global_pc_id,
        schema.globalPcIcon.entry_name,
      ],
      set: { icon_id: iconPath },
    })
}

export async function resetGlobalPcIcons(
  db: NodePgDatabase<typeof schema>,
  globalPcId: number
): Promise<void> {
  await db
    .delete(schema.globalPcIcon)
    .where(eq(schema.globalPcIcon.global_pc_id, globalPcId))
}

export async function resolveDesktopEntryIcon(
  db: NodePgDatabase<typeof schema>,
  globalPcId: number,
  directoryId: number,
  entryName: string
): Promise<string | undefined> {
  if (!entryName.endsWith('.gapp')) return undefined

  const [row] = await db
    .select({ icon_id: schema.globalPcIcon.icon_id })
    .from(schema.globalPcIcon)
    .where(
      and(
        eq(schema.globalPcIcon.global_pc_id, globalPcId),
        eq(schema.globalPcIcon.entry_name, entryName)
      )
    )
    .limit(1)

  const storedPath = row ? normalizeResourceIconPath(row.icon_id) : undefined
  if (storedPath) {
    return storedPath
  }

  const manifestIcon = await resolveGappIconPath(db, directoryId, entryName)
  if (manifestIcon) {
    await setGlobalPcIconIfAbsent(db, globalPcId, entryName, manifestIcon)
    return manifestIcon
  }

  return undefined
}
