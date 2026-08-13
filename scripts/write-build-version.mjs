import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function resolveShortSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

const sha = resolveShortSha()
const payload = {
  sha,
  label: `GlobalOS version ${sha}`,
}

const targets = [
  path.join(process.cwd(), 'src/build-version.json'),
  path.join(process.cwd(), 'src/frontend/src/build-version.json'),
]

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`)
}

console.log(`Wrote build version: ${payload.label}`)
