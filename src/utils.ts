const hostsToRegex = (hostPatterns: string[]): RegExp => {
  let combinedRegex = '(' + hostPatterns.join('|') + ')'
  return new RegExp(combinedRegex)
}

const removeLeadingSlash = (path: string): string => {
  return path.replace(/^\/+/, '')
}

export const pathFromHostnameAndPath = (
  hostname: string,
  path: string
): string => {
  // Extract hostname without port
  const hostWithoutPort = hostname.split(':')[0];
  
  // Instance subdomain: subdomain.app.dev.onetrueos.com or subdomain.app.onetrueos.com (but NOT app)
  const instanceMatch = hostWithoutPort.match(/^([a-z0-9]+)\.app(?:\.dev)?\.onetrueos\.com$/);
  if (instanceMatch && instanceMatch[1] !== 'app') {
    return '/instance/' + instanceMatch[1] + '/' + removeLeadingSlash(path);
  }
  
  // Landing page
  if (hostWithoutPort === 'www.onetrueos.com') {
    return '/www'
  }

  // Apex redirect to www
  if (hostWithoutPort === 'onetrueos.com') {
    return '/www-redirect'
  }

  // App domains: app.dev.onetrueos.com (dev), app.app.onetrueos.com (prod), global-os.vercel.app + any *.vercel.app preview URLs
  if (hostWithoutPort === 'app.dev.onetrueos.com' || hostWithoutPort == 'app.app.dev.onetrueos.com' || hostWithoutPort === 'app.app.onetrueos.com' || hostWithoutPort.endsWith('.vercel.app')) {

    // Needed to support Vite dev server ONLY
    if (path.startsWith('/assets/')) {
      return '/static' + path
    }

    if (path.startsWith('/static/')) {
      return path
    }
    return path === '/' ? '/app' : '/app/' + removeLeadingSlash(path);
  }
  
  // Fallback for unrecognized domains (e.g., Vercel preview URLs)
  return path
}