const PREFIX = 'globalos:process-state'

export function stateKey(workspaceId: string, processId: number): string {
  return `${PREFIX}:${workspaceId}:${processId}`
}

/** undefined = no saved state, null = corrupt blob */
export function loadProcessState(
  workspaceId: string,
  processId: number
): Record<string, unknown> | null | undefined {
  const raw = localStorage.getItem(stateKey(workspaceId, processId))
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function saveProcessState(
  workspaceId: string,
  processId: number,
  state: Record<string, unknown>
): void {
  localStorage.setItem(stateKey(workspaceId, processId), JSON.stringify(state))
}
