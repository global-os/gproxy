import { loadProcessState, saveProcessState } from './state'
import type { ActiveOperation, KernelMessage, KernelWindowContext } from './types'

export type KernelWindowBinding = KernelWindowContext & {
  iframe: HTMLIFrameElement
}

function isKernelMessage(data: unknown): data is KernelMessage {
  return typeof data === 'object' && data !== null && typeof (data as KernelMessage).type === 'string'
}

export class SessionKernel {
  private readonly bindings = new Map<number, KernelWindowBinding>()
  /** Per-process opaque state (schema owned by the app). */
  private readonly processState = new Map<number, Record<string, unknown>>()
  /** In-flight operation per process (e.g. which window is saving). */
  private readonly activeOps = new Map<number, ActiveOperation>()

  constructor(private readonly sessionId: string) {}

  register(binding: KernelWindowBinding) {
    this.bindings.set(binding.windowId, binding)
    if (!this.processState.has(binding.processId)) {
      const persisted = loadProcessState(this.sessionId, binding.processId)
      if (persisted) this.processState.set(binding.processId, persisted)
    }
  }

  unregister(windowId: number) {
    const binding = this.bindings.get(windowId)
    if (!binding) return

    const active = this.activeOps.get(binding.processId)
    if (active?.windowId === windowId) {
      this.activeOps.delete(binding.processId)
    }
    this.bindings.delete(windowId)
  }

  handleMessage(event: MessageEvent) {
    const binding = this.findBinding(event.source)
    if (!binding || !isKernelMessage(event.data)) return

    const post = (msg: KernelMessage) => {
      binding.iframe.contentWindow?.postMessage(msg, '*')
    }

    switch (event.data.type) {
      case 'ready':
        this.onReady(binding, post)
        break
      case 'save':
        void this.onSave(binding, event.data, post)
        break
      case 'die:response':
        break
    }
  }

  private defaultFilename(binding: KernelWindowBinding): string {
    return 'Untitled.txt'
  }

  private onReady(binding: KernelWindowBinding, post: (msg: KernelMessage) => void) {
    const state = this.resolveProcessState(binding.processId)
    if (state === undefined) {
      post({
        type: 'init:fresh',
        reason: 'fresh',
        filename: this.defaultFilename(binding),
      })
      return
    }
    if (state === null) {
      post({
        type: 'init:fresh',
        reason: 'corrupted',
        filename: this.defaultFilename(binding),
      })
      return
    }
    post({ type: 'init', ...state })
  }

  private async onSave(
    binding: KernelWindowBinding,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    if (this.activeOps.get(binding.processId)?.op === 'save') {
      console.warn(`[kernel] save already in progress for process ${binding.processId}`)
      return
    }

    this.activeOps.set(binding.processId, { op: 'save', windowId: binding.windowId })

    const { type: _type, ...state } = message
    const filename = typeof state.filename === 'string' ? state.filename : ''
    const content = typeof state.content === 'string' ? state.content : ''

    try {
      const r = await fetch('/api/fs/desktop/files', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ filename, content }),
      })

      if (!r.ok) {
        let message = `Save failed (${r.status})`
        try {
          const body = (await r.json()) as { message?: string }
          if (body.message) message = body.message
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      this.processState.set(binding.processId, state)
      saveProcessState(this.sessionId, binding.processId, state)
      window.dispatchEvent(new CustomEvent('globalos:desktop-updated'))
      post({ type: 'save:complete', filename })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      post({ type: 'save:error', message })
    } finally {
      this.activeOps.delete(binding.processId)
    }
  }

  private resolveProcessState(processId: number): Record<string, unknown> | null | undefined {
    if (this.processState.has(processId)) {
      return this.processState.get(processId)!
    }
    const persisted = loadProcessState(this.sessionId, processId)
    if (persisted) {
      this.processState.set(processId, persisted)
    }
    return persisted
  }

  private findBinding(source: MessageEventSource | null): KernelWindowBinding | undefined {
    if (!source) return undefined
    for (const binding of this.bindings.values()) {
      if (binding.iframe.contentWindow === source) return binding
    }
    return undefined
  }
}