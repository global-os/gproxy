import {
  fsBrowse,
  fsDelete,
  fsMkdir,
  fsRead,
  fsRename,
  fsSaveDesktopFile,
} from './fs.js'
import { windowOpen, windowOpenProcess } from './window.js'
import type { SyscallContext, SyscallHandler, SyscallResult } from './types.js'

const handlers: Record<string, SyscallHandler> = {
  'fs.browse': fsBrowse,
  'fs.mkdir': fsMkdir,
  'fs.rename': fsRename,
  'fs.delete': fsDelete,
  'fs.read': fsRead,
  'fs.saveDesktopFile': fsSaveDesktopFile,
  'window.open': windowOpen,
  'window.open.process': windowOpenProcess,
}

export async function invokeSyscall(
  ctx: SyscallContext,
  op: string,
  args: Record<string, unknown>,
): Promise<SyscallResult> {
  const handler = handlers[op]
  if (!handler) {
    return { ok: false, message: `Unknown syscall: ${op}`, status: 400 }
  }

  return handler(ctx, args)
}