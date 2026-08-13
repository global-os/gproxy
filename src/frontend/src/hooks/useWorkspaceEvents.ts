import { useEffect, useRef } from 'react'
import {
  workspaceEventTransport,
  type WorkspaceEventHandlers,
} from '../events/workspace-events'

export function useWorkspaceEvents(
  workspaceId: string,
  handlers: WorkspaceEventHandlers
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const disconnect = workspaceEventTransport.connect(workspaceId, {
      onEvent: (event) => handlersRef.current.onEvent?.(event),
      onProcessKilled: (event) => handlersRef.current.onProcessKilled?.(event),
      onError: (error) => handlersRef.current.onError?.(error),
    })

    return disconnect
  }, [workspaceId])
}
