function findIndexPath(paths: Iterable<string>): string | null {
  const pathSet = new Set(paths)
  if (pathSet.has('index.html')) return 'index.html'
  for (const entryPath of pathSet) {
    if (entryPath.endsWith('/index.html')) return entryPath
  }
  return null
}

function indexDirectoryPrefix(paths: Iterable<string>): string | null {
  const indexPath = findIndexPath(paths)
  if (!indexPath) return null
  const slash = indexPath.lastIndexOf('/')
  return slash >= 0 ? indexPath.slice(0, slash + 1) : ''
}

/** Map an HTTP path to a file path inside an extracted bundle. */
export function resolveBundlePath(
  paths: Iterable<string>,
  urlPath: string
): string | null {
  const pathSet = new Set(paths)
  const safePath = urlPath.replace(/^(\.\.(\/|\\|$))+/, '')
  const relative = safePath === '/' ? '' : safePath.replace(/^\//, '')

  if (relative && pathSet.has(relative)) return relative

  if (relative) {
    const indexDir = indexDirectoryPrefix(pathSet)
    if (indexDir) {
      const sibling = `${indexDir}${relative}`
      if (pathSet.has(sibling)) return sibling
    }

    const withSlash = relative.endsWith('/') ? relative : `${relative}/`
    const indexCandidate = `${withSlash}index.html`
    if (pathSet.has(indexCandidate)) return indexCandidate
  }

  if (!relative || relative.endsWith('/')) {
    return findIndexPath(pathSet)
  }

  return null
}
