// Session kernel bridge for the tracer:
//   ready            -> init / init:fresh
//   trace:subscribe  -> trace:subscribed  (+ session-wide trace:event stream)
//   trace:unsubscribe -> trace:unsubscribed

export function postToParent(message) {
  window.parent.postMessage(message, '*')
}

export function waitForAnyMessage(
  types,
  { timeoutMs = 10_000, generation = 0, isCurrent } = {}
) {
  const expected = new Set(types)
  return new Promise((resolve, reject) => {
    const timer =
      timeoutMs > 0
        ? window.setTimeout(() => {
            cleanup()
            reject(
              new Error(`Timed out waiting for ${[...expected].join(' | ')}`)
            )
          }, timeoutMs)
        : null

    const onMessage = (event) => {
      const data = event.data
      if (!data || !expected.has(data.type)) return
      if (typeof isCurrent === 'function' && !isCurrent(generation)) return
      cleanup()
      resolve(data)
    }

    const cleanup = () => {
      if (timer != null) window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
  })
}

export function waitForMessage(
  type,
  { timeoutMs = 10_000, generation = 0, isCurrent } = {}
) {
  return new Promise((resolve, reject) => {
    const timer =
      timeoutMs > 0
        ? window.setTimeout(() => {
            cleanup()
            reject(new Error(`Timed out waiting for ${type}`))
          }, timeoutMs)
        : null

    const onMessage = (event) => {
      const data = event.data
      if (!data || data.type !== type) return
      if (typeof isCurrent === 'function' && !isCurrent(generation)) return
      cleanup()
      resolve(data)
    }

    const cleanup = () => {
      if (timer != null) window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
  })
}

export function onTraceEvent(handler) {
  const listener = (event) => {
    const data = event.data
    if (!data || data.type !== 'trace:event') return
    handler(data)
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
