import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { FileEntry } from '../db/file.js'
import type { GappCompileContext } from './compile-context.js'
import { compileSquintSource } from './compile-squint.js'
import { resolveGappConfig } from './resolve-config.js'
import { resolvePlatformDependencies } from './resolve-dependencies.js'
import { resolveLibDeps, type ResolvedLib } from './resolve-lib-deps.js'

function injectDependencyScripts(html: string, deps: { path: string }[]): string {
  if (deps.length === 0) return html
  const tags = deps.map((d) => `<script src="${d.path}"></script>`).join('\n')
  const marker = '<script type="module" src="app.js"></script>'
  if (html.includes(marker)) {
    return html.replace(marker, `${tags}\n${marker}`)
  }
  return html.replace('</body>', `${tags}\n${marker}\n</body>`)
}

function injectImportMap(html: string, libs: ResolvedLib[]): string {
  if (libs.length === 0) return html
  const imports: Record<string, string> = {}
  for (const lib of libs) imports[lib.name] = lib.urlPath
  const tag = `<script type="importmap">\n${JSON.stringify({ imports }, null, 2)}\n</script>`
  // Must appear before the first module script
  const moduleIdx = html.indexOf('<script type="module"')
  if (moduleIdx >= 0) {
    return html.slice(0, moduleIdx) + tag + '\n' + html.slice(moduleIdx)
  }
  return html.replace('</head>', `${tag}\n</head>`)
}

function injectSideEffectModules(html: string, libs: ResolvedLib[]): string {
  if (libs.length === 0) return html
  const tags = libs.map((l) => `<script type="module">import '${l.name}'</script>`).join('\n')
  const marker = '<script type="module" src="app.js"></script>'
  if (html.includes(marker)) {
    return html.replace(marker, `${tags}\n${marker}`)
  }
  return html.replace('</body>', `${tags}\n</body>`)
}

export async function compileGappTree(
  dirName: string,
  files: FileEntry[],
  ctx?: GappCompileContext,
): Promise<FileEntry[]> {
  const manifest = resolveGappConfig(dirName, files)

  const libs = manifest?.deps ? resolveLibDeps(manifest.deps) : []
  const hasSquint = !!manifest?.compile?.squint

  if (libs.length === 0 && !hasSquint) return files

  const entry = manifest?.entry ?? 'index.html'
  const entryPath = `${dirName}/${entry}`

  // For non-squint apps: inject import map into HTML and return.
  if (!hasSquint) {
    const entryIdx = files.findIndex((f) => f.path === entryPath)
    if (entryIdx < 0 || libs.length === 0) return files
    const html = files[entryIdx]!.content.toString('utf8')
    const out = [...files]
    out[entryIdx] = { ...out[entryIdx]!, content: Buffer.from(injectImportMap(html, libs), 'utf8') }
    return out
  }

  // Squint app: compile ClojureScript + inject import map + inject side-effect modules.
  const squint = manifest!.compile!.squint!
  const sourcePath = `${dirName}/${squint.source}`
  const source = files.find((f) => f.path === sourcePath)
  if (!source) {
    throw new Error(`compile.squint source not found: ${squint.source}`)
  }

  const bundleLabel = ctx?.bundleName ?? dirName
  await ctx?.log.info('compile', `Compiling ${squint.source} → ${squint.output} for ${bundleLabel}`)

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gapp-source-'))
  try {
    const absSource = path.join(tmp, path.basename(squint.source))
    await fs.writeFile(absSource, source.content)

    let appJs: Buffer
    try {
      appJs = await compileSquintSource(absSource, squint)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const detail =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail?: string }).detail ?? '')
          : undefined
      await ctx?.log.error('compile', message, detail || undefined)
      throw err
    }

    const platformDeps = await resolvePlatformDependencies(manifest!)

    const out = files.filter(
      (f) =>
        f.path !== `${dirName}/${squint.output}` &&
        !platformDeps.some((d) => f.path === `${dirName}/${d.path}`),
    )

    for (const dep of platformDeps) {
      out.push({ name: dep.path, path: `${dirName}/${dep.path}`, content: dep.content })
    }

    out.push({
      name: path.basename(squint.output),
      path: `${dirName}/${squint.output}`,
      content: appJs,
    })

    const entryIdx = out.findIndex((f) => f.path === entryPath)
    if (entryIdx >= 0) {
      let html = out[entryIdx]!.content.toString('utf8')
      if (platformDeps.length > 0) {
        html = injectDependencyScripts(html, platformDeps.map((d) => ({ path: d.path })))
      }
      if (libs.length > 0) {
        html = injectImportMap(html, libs)
        html = injectSideEffectModules(html, libs)
      }
      out[entryIdx] = { ...out[entryIdx]!, content: Buffer.from(html, 'utf8') }
    }

    await ctx?.log.info('compile', `Compiled ${squint.output} (${appJs.length} bytes) for ${bundleLabel}`)

    return out
  } finally {
    await fs.rm(tmp, { recursive: true, force: true })
  }
}
