/** Max total bytes of extracted instance bundles kept in Postgres LRU cache. */
export const INSTANCE_CACHE_MAX_BYTES = Number(
  process.env.INSTANCE_CACHE_MAX_BYTES ?? 512 * 1024 * 1024
)

export const CLEANUP_INTERVAL_MS = Number(
  process.env.RUNTIME_CLEANUP_INTERVAL_MS ?? 60 * 1000
)
