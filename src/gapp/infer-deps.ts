const DEP_PATTERNS: Record<string, RegExp> = {
  yjs: /js\/Y\b|\["yjs"|:as\s+Y\]/,
  rxjs: /js\/rxjs\b|\["rxjs"|:as\s+rx\]/,
}

export function inferDepsFromSquintSource(source: string): string[] {
  const deps: string[] = []
  for (const [id, pattern] of Object.entries(DEP_PATTERNS)) {
    if (pattern.test(source)) deps.push(id)
  }
  return deps
}
