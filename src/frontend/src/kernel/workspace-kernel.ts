import { loadProcessState, saveProcessState } from './state'
import type { ActiveOperation, KernelMessage, KernelWindowContext } from './types'

export type KernelWindowBinding = KernelWindowContext & {
  iframe: HTMLIFrameElement
}

function isKernelMessage(data: unknown): data is KernelMessage {
  return typeof data === 'object' && data !== null && typeof (data as KernelMessage).type === 'string'
}

type TraceEvent = {
  type: 'trace:event'
  at: number
  direction: 'in' | 'out'
  windowId: number
  processId: number
  bundleName: string
  title: string
  message: KernelMessage
}

export class WorkspaceKernel {
  private readonly bindings = new Map<number, KernelWindowBinding>()
  /** Per-process opaque state (schema owned by the app). */
  private readonly processState = new Map<number, Record<string, unknown>>()
  /** In-flight operation per process (e.g. which window is saving). */
  private readonly activeOps = new Map<number, ActiveOperation>()
  /** Windows subscribed to workspace-wide kernel trace events. */
  private readonly tracers = new Set<number>()
  /** Unique ID for this page load; sent to apps in init messages so they can generate scoped request IDs. */
  private readonly visitId = crypto.randomUUID().replace(/-/g, '').slice(0, 8)

  constructor(private readonly workspaceId: string) {}

  register(binding: KernelWindowBinding) {
    this.bindings.set(binding.windowId, binding)
    if (!this.processState.has(binding.processId)) {
      const persisted = loadProcessState(this.workspaceId, binding.processId)
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
    this.tracers.delete(windowId)
  }

  private emitTrace(
    binding: KernelWindowBinding,
    direction: TraceEvent['direction'],
    message: KernelMessage,
  ) {
    if (this.tracers.size === 0) return

    const payload: TraceEvent = {
      type: 'trace:event',
      at: Date.now(),
      direction,
      windowId: binding.windowId,
      processId: binding.processId,
      bundleName: binding.bundleName,
      title: binding.title,
      message,
    }

    for (const windowId of this.tracers) {
      const tracer = this.bindings.get(windowId)
      tracer?.iframe.contentWindow?.postMessage(payload, '*')
    }
  }

  handleMessage(event: MessageEvent) {
    if (!isKernelMessage(event.data)) return

    console.log('Kernel message: ', event)

    const binding = this.findBinding(event.source)
    if (!binding) return

    this.processMessage(binding, event.data)
  }

  private processMessage(binding: KernelWindowBinding, message: KernelMessage) {
    this.emitTrace(binding, 'in', message)

    const post = (msg: KernelMessage) => {
      binding.iframe.contentWindow?.postMessage(msg, '*')
      this.emitTrace(binding, 'out', msg)
    }

    switch (message.type) {
      case 'ready':
        this.onReady(binding, post)
        break
      case 'save':
        void this.onSave(binding, message, post)
        break
      case 'syscall':
        void this.onSyscall(message, post)
        break
      case 'fs:browse':
        void this.onFsOp('fs.browse', message, post, 'fs:browse')
        break
      case 'fs:mkdir':
        void this.onFsOp('fs.mkdir', message, post, 'fs:mkdir', { notifyDesktop: true })
        break
      case 'fs:rename':
        void this.onFsOp('fs.rename', message, post, 'fs:rename', { notifyDesktop: true })
        break
      case 'fs:delete':
        void this.onFsOp('fs.delete', message, post, 'fs:delete', { notifyDesktop: true })
        break
      case 'fs:read':
        void this.onFsOp('fs.read', message, post, 'fs:read')
        break
      case 'window:open':
        void this.onWindowOpen(binding, message, post)
        break
      case 'window:open:self':
        void this.onWindowOpenSelf(binding, message, post)
        break
      case 'webview:create':
        void this.onWebviewCreate(binding, message, post)
        break
      case 'webview:destroy':
        void this.onWebviewDestroy(binding, message, post)
        break
      case 'die:response':
        break
      case 'trace:subscribe':
        this.tracers.add(binding.windowId)
        post({ type: 'trace:subscribed' })
        break
      case 'trace:unsubscribe':
        this.tracers.delete(binding.windowId)
        post({ type: 'trace:unsubscribed' })
        break
    }
  }

  private async readSyscallError(r: Response, fallback: string): Promise<string> {
    let message = fallback
    try {
      const body = (await r.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }
    return message
  }

  private async invokeSyscall(
    op: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const r = await fetch('/api/syscalls', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ op, ...args }),
    })

    if (!r.ok) {
      throw new Error(await this.readSyscallError(r, `Syscall failed (${r.status})`))
    }

    if (r.status === 204) return undefined

    const text = await r.text()
    if (!text) return undefined

    return JSON.parse(text) as unknown
  }

  private notifyDesktopUpdated() {
    window.dispatchEvent(new CustomEvent('globalos:desktop-updated'))
  }

  private async onSyscall(
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    const op = message.op
    const requestId = message.requestId

    if (typeof op !== 'string' || !op.trim()) {
      post({
        type: 'syscall:error',
        requestId,
        message: 'Invalid syscall request',
      })
      return
    }

    const { type: _type, op: _op, requestId: _requestId, ...args } = message

    try {
      const result = await this.invokeSyscall(op, args)
      post({ type: 'syscall:complete', requestId, result })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Syscall failed'
      post({ type: 'syscall:error', requestId, message: errMessage })
    }
  }

  private async onFsOp(
    op: string,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
    replyPrefix: string,
    options?: { notifyDesktop?: boolean },
  ) {
    const { type: _type, requestId, ...args } = message
    const replyBase =
      typeof requestId === 'string' ? { requestId } : {}

    try {
      const result = await this.invokeSyscall(op, args)
      if (options?.notifyDesktop) this.notifyDesktopUpdated()
      post({ type: `${replyPrefix}:complete`, ...replyBase, result })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Request failed'
      post({ type: `${replyPrefix}:error`, ...replyBase, message: errMessage })
    }
  }

  private async onWindowOpen(
    binding: KernelWindowBinding,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    const { type: _type, requestId, ...args } = message
    const replyBase = typeof requestId === 'string' ? { requestId } : {}
    try {
      const result = await this.invokeSyscall('window.open', {
        ...args,
        _workspaceId: this.workspaceId,
      })
      window.dispatchEvent(new CustomEvent('globalos:window-opened', { detail: result }))
      post({ type: 'window:open:complete', ...replyBase, result })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Failed to open window'
      post({ type: 'window:open:error', ...replyBase, message: errMessage })
    }
  }

  private async onWindowOpenSelf(
    binding: KernelWindowBinding,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    const { type: _type, requestId, ...args } = message
    const replyBase = typeof requestId === 'string' ? { requestId } : {}
    try {
      const result = await this.invokeSyscall('window.open.process', {
        ...args,
        _workspaceId: this.workspaceId,
        _processId: binding.processId,
      })
      window.dispatchEvent(new CustomEvent('globalos:window-opened', { detail: result }))
      post({ type: 'window:open:complete', ...replyBase, result })
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Failed to open window'
      post({ type: 'window:open:error', ...replyBase, message: errMessage })
    }
  }

  private defaultFilename(_binding: KernelWindowBinding): string {
    return 'Untitled.txt'
  }

  private onReady(binding: KernelWindowBinding, post: (msg: KernelMessage) => void) {
    const state = this.resolveProcessState(binding.processId)
    if (state === undefined) {
      post({
        type: 'init:fresh',
        reason: 'fresh',
        filename: this.defaultFilename(binding),
        visitId: this.visitId,
      })
      return
    }
    if (state === null) {
      post({
        type: 'init:fresh',
        reason: 'corrupted',
        filename: this.defaultFilename(binding),
        visitId: this.visitId,
      })
      return
    }
    post({ type: 'init', ...state, visitId: this.visitId })
  }

  private async onSave(
    binding: KernelWindowBinding,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    if (this.activeOps.get(binding.processId)?.op === 'save') {
      console.warn(`[kernel] save already in progress for process ${binding.processId}`)
      post({ type: 'save:error', message: 'Save already in progress' })
      return
    }

    this.activeOps.set(binding.processId, { op: 'save', windowId: binding.windowId })

    const { type: _type, ...state } = message
    const filename = typeof state.filename === 'string' ? state.filename : ''
    const content = typeof state.content === 'string' ? state.content : ''

    try {
      await this.invokeSyscall('fs.saveDesktopFile', { filename, content })

      this.processState.set(binding.processId, state)
      saveProcessState(this.workspaceId, binding.processId, state)
      this.notifyDesktopUpdated()
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
    const persisted = loadProcessState(this.workspaceId, processId)
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

  private async callApi<T>(path: string, method: string, body?: unknown): Promise<T> {
    const r = await fetch(path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!r.ok) {
      let msg = `API error (${r.status})`
      try { msg = ((await r.json()) as { message?: string }).message ?? msg } catch {}
      throw new Error(msg)
    }
    if (r.status === 204) return undefined as T
    return r.json() as Promise<T>
  }

  private async onWebviewCreate(
    binding: KernelWindowBinding,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    const requestId = typeof message.requestId === 'string' ? message.requestId : undefined
    const replyBase = requestId ? { requestId } : {}
    const domain = typeof message.domain === 'string' ? message.domain : ''
    if (!domain) {
      post({ type: 'webview:create:error', ...replyBase, message: 'domain is required' })
      return
    }
    try {
      const result = await this.callApi<{
        webviewId: string
        slug: string
        domain: string
        proxyOrigin: string
      }>('/api/webviews', 'POST', { processId: binding.processId, domain })
      console.log('[kernel] webview:create succeeded:', result)
      post({ type: 'webview:create:complete', ...replyBase, ...result })
    } catch (err) {
      console.error('[kernel] webview:create failed:', err)
      post({
        type: 'webview:create:error',
        ...replyBase,
        message: err instanceof Error ? err.message : 'Failed to create webview',
      })
    }
  }

  private async onWebviewDestroy(
    binding: KernelWindowBinding,
    message: KernelMessage,
    post: (msg: KernelMessage) => void,
  ) {
    const requestId = typeof message.requestId === 'string' ? message.requestId : undefined
    const replyBase = requestId ? { requestId } : {}
    const webviewId = typeof message.webviewId === 'string' ? message.webviewId : ''
    if (!webviewId) {
      post({ type: 'webview:destroy:error', ...replyBase, message: 'webviewId is required' })
      return
    }
    try {
      await this.callApi(`/api/webviews/${webviewId}`, 'DELETE')
      post({ type: 'webview:destroy:complete', ...replyBase, webviewId })
    } catch (err) {
      post({
        type: 'webview:destroy:error',
        ...replyBase,
        message: err instanceof Error ? err.message : 'Failed to destroy webview',
      })
    }
  }
}
