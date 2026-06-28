/** Max total bytes of extracted instance bundles kept in Postgres LRU cache. */
export const INSTANCE_CACHE_MAX_BYTES = Number(
  process.env.INSTANCE_CACHE_MAX_BYTES ?? 512 * 1024 * 1024,
)

export const CLEANUP_INTERVAL_MS = Number(process.env.RUNTIME_CLEANUP_INTERVAL_MS ?? 60 * 1000)

export const INSTANCE_DOMAIN_SUFFIX =
  process.env.INSTANCE_DOMAIN_SUFFIX ??
  (process.env.NODE_ENV === 'production' ? 'app.onetrueos.com' : 'app.dev.onetrueos.com')

/** Origin used in iframe URLs (defaults to backend port 3000 in dev). */
export function instancePublicUrl(instanceSlug: string): string {
  if (process.env.INSTANCE_PUBLIC_ORIGIN) {
    return new URL(`${instanceSlug}.${INSTANCE_DOMAIN_SUFFIX}/`, process.env.INSTANCE_PUBLIC_ORIGIN).toString()
  }
  const protocol = process.env.INSTANCE_PUBLIC_PROTOCOL ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const port = process.env.INSTANCE_PUBLIC_PORT ?? (process.env.NODE_ENV === 'production' ? '' : '3000')
  const portSuffix = port ? `:${port}` : ''
  return `${protocol}://${instanceSlug}.${INSTANCE_DOMAIN_SUFFIX}${portSuffix}/`
}