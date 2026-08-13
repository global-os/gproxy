export const INSTANCE_DOMAIN_SUFFIX =
  process.env.INSTANCE_DOMAIN_SUFFIX ??
  (process.env.NODE_ENV === 'production'
    ? 'app.onetrueos.com'
    : 'app.dev.onetrueos.com')

/** Origin used in iframe URLs (defaults to backend port 3000 in dev). */
export function instancePublicUrl(instanceSlug: string): string {
  if (process.env.INSTANCE_PUBLIC_ORIGIN) {
    return new URL(
      `${instanceSlug}.${INSTANCE_DOMAIN_SUFFIX}/`,
      process.env.INSTANCE_PUBLIC_ORIGIN
    ).toString()
  }
  const protocol =
    process.env.INSTANCE_PUBLIC_PROTOCOL ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const port =
    process.env.INSTANCE_PUBLIC_PORT ??
    (process.env.NODE_ENV === 'production' ? '' : '3000')
  const portSuffix = port ? `:${port}` : ''
  return `${protocol}://${instanceSlug}.${INSTANCE_DOMAIN_SUFFIX}${portSuffix}/`
}

export function instanceSlugFromHostname(hostname: string): string {
  return hostname.split('.')[0]
}

export function stripInstancePrefix(pathname: string, slug: string): string {
  const prefix = `/instance/${slug}`
  if (pathname === prefix || pathname === `${prefix}/`) return '/'
  if (pathname.startsWith(`${prefix}/`)) {
    const rest = pathname.slice(prefix.length)
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  return pathname
}
