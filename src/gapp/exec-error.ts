export function formatExecError(err: unknown): { message: string; detail?: string } {
  if (!err || typeof err !== 'object') {
    return { message: String(err) }
  }

  const e = err as {
    message?: string
    stderr?: string | Buffer
    stdout?: string | Buffer
  }

  const stderr = e.stderr ? String(e.stderr).trim() : ''
  const stdout = e.stdout ? String(e.stdout).trim() : ''
  const detail = stderr || stdout || undefined

  let message = e.message ?? 'Command failed'
  if (stderr) {
    const squintLine = stderr
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('Error:') || line.includes('[squint]'))
    if (squintLine) {
      message = squintLine.replace(/^Error:\s*/, '')
    }
  }

  return { message, detail }
}