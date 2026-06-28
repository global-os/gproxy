// Parent kernel bridge — postMessage activates platform syscalls (POST /api/syscalls):
//   fs:browse -> fs.browse -> fs:browse:complete | fs:browse:error
//   fs:delete -> fs.delete -> fs:delete:complete | fs:delete:error

const pending = new Map()
let nextRequestId = 0
const DEFAULT_TIMEOUT_MS = 15_000

export function toParent(type, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const requestId = `${type}-${++nextRequestId}`
  return new Promise((resolve, reject) => {
    const timer = timeoutMs > 0
      ? window.setTimeout(() => {
          pending.delete(requestId)
          reject(new Error(`Timed out waiting for ${type}`))
        }, timeoutMs)
      : null

    const settle = (fn, value) => {
      if (timer != null) window.clearTimeout(timer)
      pending.delete(requestId)
      fn(value)
    }

    pending.set(requestId, {
      resolve: (value) => settle(resolve, value),
      reject: (err) => settle(reject, err),
    })
    window.parent.postMessage({ type, requestId, ...payload }, '*')
  })
}

window.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data.type !== 'string') return
  if (!data.type.endsWith(':complete') && !data.type.endsWith(':error')) return

  const requestId = typeof data.requestId === 'string' ? data.requestId : null
  if (!requestId) return

  const handlers = pending.get(requestId)
  if (!handlers) return

  if (data.type.endsWith(':complete')) {
    handlers.resolve(data.result ?? data)
  } else {
    handlers.reject(new Error(data.message || 'Request failed'))
  }
})