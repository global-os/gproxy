// Parent kernel bridge — postMessage activates platform syscalls (POST /api/syscalls):
//   fs:browse  -> fs.browse  -> fs:browse:complete  | fs:browse:error
//   fs:mkdir   -> fs.mkdir   -> fs:mkdir:complete   | fs:mkdir:error
//   fs:rename  -> fs.rename  -> fs:rename:complete  | fs:rename:error
//   fs:delete  -> fs.delete  -> fs:delete:complete  | fs:delete:error

const pending = new Map()

export function toParent(type, payload = {}) {
  return new Promise((resolve, reject) => {
    pending.set(type, { resolve, reject })
    window.parent.postMessage({ type, ...payload }, '*')
  })
}

window.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data.type !== 'string') return
  if (!data.type.endsWith(':complete') && !data.type.endsWith(':error')) return

  const op = data.type.slice(0, data.type.lastIndexOf(':'))
  const handlers = pending.get(op)
  if (!handlers) return

  pending.delete(op)
  if (data.type.endsWith(':complete')) {
    handlers.resolve(data.result ?? data)
  } else {
    handlers.reject(new Error(data.message || 'Request failed'))
  }
})