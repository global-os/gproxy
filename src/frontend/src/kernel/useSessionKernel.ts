import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AppWindow } from '../components/Workspace/types'
import { SessionKernel, type KernelWindowBinding } from './session-kernel'

/**
 * Parent-page session kernel bridge: one kernel per workspace session, with stable
 * iframe registration so postMessage routing and trace subscriptions survive re-renders.
 */
export function useSessionKernel(sessionId: string) {
  const kernel = useMemo(() => new SessionKernel(sessionId), [sessionId])
  const bindingsRef = useRef(new Map<number, KernelWindowBinding>())
  /** Latest AppWindow per id — read by stable iframe ref callbacks (see iframeRef). */
  const windowsRef = useRef(new Map<number, AppWindow>())
  /** One ref callback per window id; identity must stay stable across parent re-renders. */
  const iframeRefFns = useRef(new Map<number, (el: HTMLIFrameElement | null) => void>())

  useEffect(() => {
    const onMessage = (event: MessageEvent) => kernel.handleMessage(event)
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [kernel])

  useEffect(() => {
    for (const binding of bindingsRef.current.values()) {
      kernel.register(binding)
    }
  }, [kernel])

  const bindWindow = useCallback((win: AppWindow, iframe: HTMLIFrameElement | null) => {
    if (!iframe) {
      bindingsRef.current.delete(win.id)
      kernel.unregister(win.id)
      return
    }

    const binding: KernelWindowBinding = {
      sessionId,
      windowId: win.id,
      processId: win.processId ?? 0,
      instanceId: win.instanceId ?? 0,
      bundleName: win.bundleName ?? `${win.title}.gapp`,
      title: win.title,
      iframe,
    }

    bindingsRef.current.set(win.id, binding)
    kernel.register(binding)
  }, [kernel, sessionId])

  /**
   * Keep kernel metadata fresh without re-binding the iframe.
   *
   * iframeRef(windowId) intentionally returns a stable callback so React does not
   * unregister/register the iframe on every workspace re-render (focus, drag, resize).
   * That callback looks up the AppWindow from windowsRef when the iframe mounts.
   *
   * syncWindow must run each render so:
   * 1) windowsRef has the current win before the iframe ref fires on first mount
   * 2) trace events and routing use up-to-date title / bundleName after launch
   *
   * Only metadata is patched here — the iframe element and windowId stay the same.
   */
  const syncWindow = useCallback((win: AppWindow) => {
    windowsRef.current.set(win.id, win)
    const binding = bindingsRef.current.get(win.id)
    if (binding) {
      binding.title = win.title
      binding.bundleName = win.bundleName ?? `${win.title}.gapp`
      binding.processId = win.processId ?? binding.processId
      binding.instanceId = win.instanceId ?? binding.instanceId
    }
  }, [])

  /** Tear down kernel registration when a window is removed from workspace state. */
  const releaseWindow = useCallback((windowId: number) => {
    const win = windowsRef.current.get(windowId)
    if (win) bindWindow(win, null)
    windowsRef.current.delete(windowId)
    iframeRefFns.current.delete(windowId)
  }, [bindWindow])

  /**
   * Stable iframe ref per window. Do not pass inline callbacks to WorkspaceWindow —
   * a new function identity each render makes React call ref(null) then ref(el),
   * which unregisters the iframe and drops trace:subscribe / message routing.
   */
  const iframeRef = useCallback((windowId: number) => {
    let fn = iframeRefFns.current.get(windowId)
    if (!fn) {
      fn = (el: HTMLIFrameElement | null) => {
        const win = windowsRef.current.get(windowId)
        if (!win) return
        bindWindow(win, el)
      }
      iframeRefFns.current.set(windowId, fn)
    }
    return fn
  }, [bindWindow])

  return { bindWindow, syncWindow, iframeRef, releaseWindow }
}