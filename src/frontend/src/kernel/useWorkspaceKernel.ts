import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AppWindow } from '../components/Workspace/types'
import { WorkspaceKernel, type KernelWindowBinding } from './workspace-kernel'

export function useWorkspaceKernel(workspaceId: string) {
  const kernel = useMemo(() => new WorkspaceKernel(workspaceId), [workspaceId])
  const bindingsRef = useRef(new Map<number, KernelWindowBinding>())
  const windowsRef = useRef(new Map<number, AppWindow>())
  const iframeRefFns = useRef(new Map<number, (el: HTMLIFrameElement | null) => void>())

  useEffect(() => {
    const onMessage = (event: MessageEvent) => kernel.handleMessage(event)
    window.addEventListener('message', onMessage)

    for (const binding of bindingsRef.current.values()) {
      kernel.register(binding)
    }

    return () => window.removeEventListener('message', onMessage)
  }, [kernel])

  const bindWindow = useCallback((win: AppWindow, iframe: HTMLIFrameElement | null) => {
    if (!iframe) {
      bindingsRef.current.delete(win.id)
      kernel.unregister(win.id)
      return
    }

    const binding: KernelWindowBinding = {
      workspaceId,
      windowId: win.id,
      processId: win.processId ?? 0,
      instanceId: win.instanceId ?? 0,
      bundleName: win.bundleName ?? `${win.title}.gapp`,
      title: win.title,
      iframe,
    }

    bindingsRef.current.set(win.id, binding)
    kernel.register(binding)
  }, [kernel, workspaceId])

  const syncWindow = useCallback((win: AppWindow) => {
    windowsRef.current.set(win.id, win)
    const binding = bindingsRef.current.get(win.id)
    if (!binding) return
    binding.title = win.title
    binding.bundleName = win.bundleName ?? `${win.title}.gapp`
    binding.processId = win.processId ?? binding.processId
    binding.instanceId = win.instanceId ?? binding.instanceId
  }, [])

  const releaseWindow = useCallback((windowId: number) => {
    const win = windowsRef.current.get(windowId)
    if (win) bindWindow(win, null)
    windowsRef.current.delete(windowId)
    iframeRefFns.current.delete(windowId)
  }, [bindWindow])

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
