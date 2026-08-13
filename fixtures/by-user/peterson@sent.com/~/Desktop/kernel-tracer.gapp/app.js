import { h, render } from './preact.mjs'
import { useCallback, useEffect, useRef, useState } from './hooks.mjs'
import {
  onTraceEvent,
  postToParent,
  waitForAnyMessage,
  waitForMessage,
} from './kernel.js'

const MAX_EVENTS = 500

function formatClock(at) {
  try {
    return new Date(at).toLocaleTimeString(undefined, {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

function stableId(event) {
  return `${event.at}:${event.direction}:${event.windowId}:${event.message?.type ?? 'unknown'}`
}

function matchesFilter(event, filter) {
  if (!filter) return true
  const haystack = [
    event.direction,
    event.bundleName,
    event.title,
    event.message?.type,
    JSON.stringify(event.message),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(filter.toLowerCase())
}

function useAsyncTask() {
  const generation = useRef(0)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const run = useCallback(async (task) => {
    const gen = ++generation.current
    setStatus('pending')
    setError(null)
    try {
      const result = await task(gen, () => gen === generation.current)
      if (gen !== generation.current) return null
      setStatus('success')
      return result
    } catch (err) {
      if (gen !== generation.current) return null
      const message = err instanceof Error ? err.message : 'Request failed'
      setStatus('error')
      setError(message)
      return null
    }
  }, [])

  const cancel = useCallback(() => {
    generation.current += 1
    setStatus('idle')
    setError(null)
  }, [])

  return { status, error, run, cancel, isPending: status === 'pending' }
}

function KernelTracerApp() {
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [connected, setConnected] = useState(false)
  const connectTask = useAsyncTask()
  const pausedRef = useRef(paused)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const connect = useCallback(
    () =>
      connectTask.run(async (_gen, isCurrent) => {
        postToParent({ type: 'ready' })
        await waitForAnyMessage(['init:fresh', 'init'], { isCurrent })
        postToParent({ type: 'trace:subscribe' })
        await waitForMessage('trace:subscribed', { isCurrent })
        setConnected(true)
        return true
      }),
    [connectTask]
  )

  useEffect(() => {
    void connect()
    return () => {
      connectTask.cancel()
      postToParent({ type: 'trace:unsubscribe' })
    }
    // Mount once; generation guard cancels stale connects on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return onTraceEvent((event) => {
      if (pausedRef.current) return
      setEvents((prev) => {
        const next = [{ ...event, id: stableId(event) }, ...prev]
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
      })
    })
  }, [])

  const filtered = events.filter((event) => matchesFilter(event, filter))
  const selected =
    filtered.find((event) => event.id === selectedId) ??
    events.find((event) => event.id === selectedId) ??
    null

  const statusText = connectTask.error
    ? connectTask.error
    : connectTask.isPending
      ? 'Connecting to session kernel…'
      : connected
        ? `${filtered.length} shown · ${events.length} captured · ${paused ? 'paused' : 'live'}`
        : 'Idle'

  return h(
    'div',
    { class: 'shell' },
    h(
      'div',
      { class: 'toolbar' },
      h(
        'button',
        {
          type: 'button',
          disabled: connectTask.isPending,
          onClick: () => void connect(),
        },
        'Reconnect'
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: () => setPaused((value) => !value),
        },
        paused ? 'Resume' : 'Pause'
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: () => {
            setEvents([])
            setSelectedId(null)
          },
        },
        'Clear'
      ),
      h('input', {
        class: 'filter',
        type: 'search',
        placeholder: 'Filter type, bundle, payload…',
        value: filter,
        onInput: (event) => setFilter(event.currentTarget.value),
      }),
      connected && h('span', { class: 'pill' }, 'subscribed')
    ),
    h(
      'div',
      { class: 'panel' },
      h(
        'div',
        { class: 'list-head' },
        h('span', null, 'Time'),
        h('span', null, 'Dir'),
        h('span', null, 'Message'),
        h('span', null, 'Source')
      ),
      h(
        'div',
        { class: 'list-body' },
        filtered.length === 0
          ? h(
              'div',
              { class: 'empty' },
              connectTask.isPending
                ? 'Waiting for kernel… open another app to generate traffic.'
                : 'No events yet. Launch or use another .gapp window.'
            )
          : filtered.map((event) =>
              h(
                'div',
                {
                  key: event.id,
                  class: `event-row${selectedId === event.id ? ' selected' : ''}`,
                  onClick: () => setSelectedId(event.id),
                },
                h('span', null, formatClock(event.at)),
                h(
                  'span',
                  { class: event.direction === 'in' ? 'dir-in' : 'dir-out' },
                  event.direction === 'in' ? '↓' : '↑'
                ),
                h(
                  'span',
                  { class: 'type' },
                  event.message?.type ?? '(no type)'
                ),
                h(
                  'span',
                  { class: 'source' },
                  event.bundleName || event.title || `#${event.windowId}`
                )
              )
            )
      )
    ),
    h(
      'div',
      { class: 'detail' },
      selected
        ? JSON.stringify(
            {
              at: selected.at,
              direction: selected.direction,
              windowId: selected.windowId,
              processId: selected.processId,
              bundleName: selected.bundleName,
              title: selected.title,
              message: selected.message,
            },
            null,
            2
          )
        : 'Select an event to inspect the full payload.'
    ),
    h(
      'div',
      { class: `statusbar${connectTask.error ? ' error' : ''}` },
      statusText
    )
  )
}

render(h(KernelTracerApp), document.getElementById('root'))
