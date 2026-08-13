import { resolveBundlePath } from './resolve-path.js'
import { listBundlePaths, readBundleFile } from './store.js'
import type { InstanceBundleFile } from './types.js'

export async function resolveInstanceBundleFile(
  instanceId: number,
  urlPath: string
): Promise<InstanceBundleFile | null> {
  const paths = await listBundlePaths(instanceId)
  if (paths.length === 0) return null

  const entryPath = resolveBundlePath(paths, urlPath)
  if (!entryPath) return null

  const data = await readBundleFile(instanceId, entryPath)
  if (!data) return null

  return { path: entryPath, data }
}
