// Downloads a patched Chromium build artifact from the MinIO object store
// (produced by chromium-fork's CI, uploaded to the `chromium-builds` bucket)
// and returns the path to its `chrome` binary so server.mjs can launch it
// via `executablePath` instead of stock `channel: 'chrome'`.
//
// The artifact is a tarball of out/Default (minus obj/gen), so it contains
// the `chrome` binary plus the component-build .so files and runtime assets
// needed to actually run it. Downloaded once and cached on local disk keyed
// by the source commit SHA; a redeploy with the same SHA reuses the cache.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import aws4 from 'aws4'
import { fetch as undiciFetch } from 'undici'

const MINIO_ENDPOINT =
  process.env.MINIO_ENDPOINT || 'https://s3.quineglobal.com'
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'chromium-builds'
// MinIO on mainframe-2 sets no explicit region, so SigV4 must sign with the
// default us-east-1. Overridable in case that ever changes.
const MINIO_REGION = process.env.MINIO_REGION || 'us-east-1'
const EXTRACT_ROOT = process.env.CHROMIUM_EXTRACT_DIR || '/tmp/custom-chromium'

function credentials() {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.MINIO_ACCESS_KEY_ID ||
    process.env.MINIO_ROOT_USER ||
    ''
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.MINIO_SECRET_ACCESS_KEY ||
    process.env.MINIO_ROOT_PASSWORD ||
    ''
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      '[chromium-artifact] missing MinIO credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)'
    )
  }
  return { accessKeyId, secretAccessKey }
}

/**
 * @param {string} sha full git commit SHA of the chromium-fork build
 * @returns {Promise<{ executablePath: string, libraryPath: string }>}
 */
export async function resolveChromiumExecutable(sha) {
  const extractDir = path.join(EXTRACT_ROOT, sha)
  const libraryPath = path.join(extractDir, 'Default')
  const executablePath = path.join(libraryPath, 'chrome')
  if (fs.existsSync(executablePath)) {
    console.log(`[chromium-artifact] using cached build ${sha}`)
    return { executablePath, libraryPath }
  }

  console.log(`[chromium-artifact] downloading ${sha} from MinIO`)
  const { accessKeyId, secretAccessKey } = credentials()
  const url = new URL(`${MINIO_ENDPOINT}/${MINIO_BUCKET}/${sha}.tar.gz`)
  const signed = aws4.sign(
    {
      host: url.host,
      path: url.pathname,
      method: 'GET',
      service: 's3',
      region: MINIO_REGION,
      headers: { Host: url.host },
    },
    { accessKeyId, secretAccessKey }
  )

  const res = await undiciFetch(url.toString(), { headers: signed.headers })
  if (!res.ok) {
    throw new Error(`[chromium-artifact] download failed: HTTP ${res.status}`)
  }

  fs.mkdirSync(EXTRACT_ROOT, { recursive: true })
  const tarPath = path.join(EXTRACT_ROOT, `${sha}.tar.gz`)
  fs.writeFileSync(tarPath, Buffer.from(await res.arrayBuffer()))

  console.log(`[chromium-artifact] extracting ${sha}`)
  fs.mkdirSync(extractDir, { recursive: true })
  const tar = spawnSync('tar', ['-xzf', tarPath, '-C', extractDir], {
    stdio: 'inherit',
  })
  fs.unlinkSync(tarPath)
  if (tar.status !== 0) {
    throw new Error(
      `[chromium-artifact] tar extraction failed (exit ${tar.status})`
    )
  }
  if (!fs.existsSync(executablePath)) {
    throw new Error(`[chromium-artifact] no chrome binary at ${executablePath}`)
  }

  console.log(`[chromium-artifact] ready: ${executablePath}`)
  return { executablePath, libraryPath }
}
