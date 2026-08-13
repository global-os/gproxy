import { parseTarBytes } from '../tar/parse.js'
import { runBundleCacheEviction } from './lru.js'
import {
  isBundleCached,
  replaceBundleCache,
  touchBundleCache,
} from './store.js'

/** Extract a tar image and store files in the Postgres bundle cache. */
export async function ensureInstanceBundleCached(
  instanceId: number,
  tarBytes: Buffer,
  checksum: string
): Promise<void> {
  if (await isBundleCached(instanceId, checksum)) {
    await touchBundleCache(instanceId)
    return
  }

  const files = await parseTarBytes(tarBytes)
  await replaceBundleCache(instanceId, checksum, files)
  await runBundleCacheEviction()
}
