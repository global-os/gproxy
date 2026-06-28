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

type PendingInbound = {
  source: MessageEventSource
  data: KernelMessage
  receivedAt: number
}

const PENDING_MAX_PER_WINDOW = 32
const PENDING_TTL_MS = 30_000

export class SessionKernel {
  private readonly bindings = new Map<number, KernelWindowBinding>()
  /** Inbound messages received before the iframe binding exists, keyed by windowId. */
  private readonly pendingByWindowId = new Map<number, PendingInbound[]>()
  /** Per-process opaque state (schema owned by the app). */
  private readonly processState = new Map<number, Record<string, unknown>>()
  /** In-flight operation per process (e.g. which window is saving). */
  private readonly activeOps = new Map<number, ActiveOperation>()
  /** Windows subscribed to session-wide kernel trace events. */
  private readonly tracers = new Set<number>()

  constructor(private readonly sessionId: string) {}

  register(binding: KernelWindowBinding) {
    this.bindings.set(binding.windowId, binding)
    if (!this.processState.has(binding.processId)) {
      const persisted = loadProcessState(this.sessionId, binding.processId)
      if (persisted) this.processState.set(binding.processId, persisted)
    }
    this.drainPending(binding)
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
    this.pendingByWindowId.delete(windowId)
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

    const binding = this.findBinding(event.source)
    if (binding) {
      this.processMessage(binding, event.data)
      return
    }

    const source = event.source
    const windowId = this.resolveWindowIdForSource(source)
    if (windowId === undefined || !source) return

    this.enqueuePending(windowId, {
      source,
      data: event.data,
      receivedAt: Date.now(),
    })
  }

  private enqueuePending(windowId: number, item: PendingInbound) {
    this.pruneExpired(windowId)

    let queue = this.pendingByWindowId.get(windowId)
    if (!queue) {
      queue = []
      this.pendingByWindowId.set(windowId, queue)
    }

    if (queue.length >= PENDING_MAX_PER_WINDOW) {
      queue.shift()
    }

    const last = queue[queue.length - 1]
    if (item.data.type === 'ready' && last?.data.type === 'ready') {
      queue[queue.length - 1] = item
      return
    }

    queue.push(item)
  }

  private pruneExpired(windowId: number) {
    const queue = this.pendingByWindowId.get(windowId)
    if (!queue) return

    const now = Date.now()
    const fresh = queue.filter((item) => now - item.receivedAt <= PENDING_TTL_MS)
    if (fresh.length) {
      this.pendingByWindowId.set(windowId, fresh)
    } else {
      this.pendingByWindowId.delete(windowId)
    }
  }

  private drainPending(binding: KernelWindowBinding) {
    const queue = this.pendingByWindowId.get(binding.windowId)
    if (!queue?.length) return

    this.pendingByWindowId.delete(binding.windowId)

    const frame = binding.iframe.contentWindow
    const now = Date.now()

    for (const item of queue) {
      if (item.source !== frame) continue
      if (now - item.receivedAt > PENDING_TTL_MS) continue
      this.processMessage(binding, item.data)
    }
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
      case 'kernel:ping':
        post({ type: 'kernel:attached' })
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
      await this.invokeSyscall('fs.saveDesktopFile', { filename, content })

      this.processState.set(binding.processId, state)
      saveProcessState(this.sessionId, binding.processId, state)
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

  /** Match an unbound iframe message to a workspace window via data-window-id on the iframe. */
  private resolveWindowIdForSource(source: MessageEventSource | null): number | undefined {
    if (!source) return undefined

    for (const binding of this.bindings.values()) {
      if (binding.iframe.contentWindow === source) return binding.windowId
    }

    const frames = document.querySelectorAll('iframe[data-window-id]')
    for (const frame of frames) {
      if (!(frame instanceof HTMLIFrameElement)) continue
      if (frame.contentWindow !== source) continue
      const id = Number(frame.dataset.windowId)
      if (Number.isInteger(id) && id > 0) return id
    }

    return undefined
  }
}