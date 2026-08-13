import fs from 'node:fs'
import path from 'node:path'

export type BuildVersion = {
  sha: string
  label: string
}

let cached: BuildVersion | null = null

export function getBuildVersion(): BuildVersion {
  if (cached) return cached

  const filePath = path.join(process.cwd(), 'src/build-version.json')
  try {
    cached = JSON.parse(fs.readFileSync(filePath, 'utf8')) as BuildVersion
    return cached
  } catch {
    cached = { sha: 'dev', label: 'GlobalOS version dev' }
    return cached
  }
}
