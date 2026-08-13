export type TbundleParseError =
  | { kind: 'unexpected-preamble' }
  | { kind: 'no-entries' }
  | { kind: 'invalid-path'; path: string; reason: string }
  | { kind: 'duplicate-path'; path: string }

export type ParseTbundleResult =
  | { ok: true; entries: Map<string, string> }
  | { ok: false; error: TbundleParseError }
