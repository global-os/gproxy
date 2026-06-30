import { getBuildVersion } from '../build-version.js'

export function imageCacheKey(dirSha: string): string {
  return `${getBuildVersion().sha}:${dirSha}`
}
