#!/usr/bin/env node
/**
 * Delete cached images (and bundle cache) for one or more .gapp directories.
 * Use this when the compiler pipeline changes and cached images may be stale.
 *
 * Usage:
 *   node scripts/bust-gapp-image-cache.mjs filebrowser.gapp
 *   node scripts/bust-gapp-image-cache.mjs filebrowser.gapp squint-editor.gapp
 *   node scripts/bust-gapp-image-cache.mjs --all
 */

import pg from 'pg'
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: { all: { type: 'boolean', default: false } },
  allowPositionals: true,
})

const names = values.all ? null : positionals
if (!values.all && names.length === 0) {
  console.error('Usage: bust-gapp-image-cache.mjs [--all] [name.gapp ...]')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  const nameFilter = names
    ? `AND d.name = ANY($1::text[])`
    : ''
  const params = names ? [names] : []

  // Evict bundle cache first (FK references instances, not images)
  const bundleResult = await client.query(`
    DELETE FROM instance_bundle_cache ibc
    USING instances i
    JOIN process p ON p.id = i.process_id
    JOIN directory d ON d.id = p.directory_id
    WHERE ibc.instance_id = i.id
      AND d.name LIKE '%.gapp'
      ${nameFilter}
    RETURNING ibc.instance_id, d.name
  `, params)

  for (const row of bundleResult.rows) {
    console.log(`Evicted bundle cache for instance ${row.instance_id} (${row.name})`)
  }

  // Delete images
  const imageResult = await client.query(`
    DELETE FROM image i
    USING directory d
    WHERE i.directory_id = d.id
      AND d.name LIKE '%.gapp'
      ${nameFilter}
    RETURNING i.id, d.name, LEFT(i.directory_checksum, 8) AS hash
  `, params)

  for (const row of imageResult.rows) {
    console.log(`Deleted image ${row.id} for ${row.name} (hash ${row.hash})`)
  }

  if (bundleResult.rows.length === 0 && imageResult.rows.length === 0) {
    console.log('Nothing to delete.')
  }
} finally {
  await client.end()
}
