// Admin-editable config (currently just PROXY_URL), set via the main app's
// admin panel. This process polls the main app periodically rather than the
// admin panel pushing to us directly — simpler direction of control, no need
// for the sidecar to expose another authenticated write endpoint.
//
// Persisted to a local file, bind-mounted outside the container (see
// petersweb-infra's virtualisation.oci-containers config) so a value set via
// the admin panel survives container rebuilds/redeploys, not just restarts.
// The env var PROXY_URL is only the initial default before anything's ever
// been set via the admin panel.
//
// Applying a change: rather than hot-swapping Chrome's proxy config
// in-process (real Chrome doesn't support changing its proxy after launch
// at all), write the new value to the local file and exit — the
// container's restart policy brings up a fresh process that reads the
// updated file at startup. A few seconds of downtime on a rare, manual
// admin action is an acceptable trade for not having to reimplement
// Chrome startup as a hot-reloadable subsystem.
import fs from 'node:fs'
import path from 'node:path'
import { createDecipheriv, createHash } from 'node:crypto'

const CONFIG_PATH = process.env.CONFIG_PATH || '/data/config.json'
const MAIN_APP_URL = (process.env.MAIN_APP_URL || '').replace(/\/$/, '')
const SECRET = process.env.SIDECAR_SECRET || ''
const POLL_INTERVAL_MS = 60_000

function readLocalConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function writeLocalConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  } catch (err) {
    console.error('[config] failed to write local config:', err instanceof Error ? err.message : String(err))
  }
}

/** The effective PROXY_URL to use: read from local config file only (set via admin panel poll). */
export function resolveProxyUrl() {
  return readLocalConfig().proxyUrl || ''
}

export function startConfigPolling() {
  if (!MAIN_APP_URL) {
    console.log('[config] MAIN_APP_URL not set, admin-panel config polling disabled')
    return
  }

  const current = resolveProxyUrl()

  setInterval(async () => {
    try {
      const res = await fetch(`${MAIN_APP_URL}/api/sidecar-config`, {
        headers: SECRET ? { Authorization: `Bearer ${SECRET}` } : {},
      })
      if (!res.ok) {
        console.error(`[config] poll got status ${res.status}`)
        return
      }
      const data = await res.json()
      let proxyUrl = data.proxyUrl
      if (data.encrypted && proxyUrl && SECRET) {
        const [ivHex, ctHex, tagHex] = proxyUrl.split(':')
        const key = createHash('sha256').update(SECRET).digest()
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
        proxyUrl = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8')
      }
      const effective = proxyUrl || ''
      if (effective !== current) {
        console.log('[config] proxy_url changed via admin panel — writing local config and restarting to apply')
        writeLocalConfig({ proxyUrl: proxyUrl || null })
        process.exit(0)
      }
    } catch (err) {
      console.error('[config] poll failed:', err instanceof Error ? err.message : String(err))
    }
  }, POLL_INTERVAL_MS)

  console.log(`[config] polling ${MAIN_APP_URL}/api/sidecar-config every ${POLL_INTERVAL_MS / 1000}s`)
}
