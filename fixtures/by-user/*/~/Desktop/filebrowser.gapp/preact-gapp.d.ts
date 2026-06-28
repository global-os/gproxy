declare module 'preact' {
  export function h(
    type: unknown,
    props?: Record<string, unknown> | null,
    ...children: unknown[]
  ): unknown
  export function render(vnode: unknown, parent: Element): void
}

declare module 'preact/hooks' {
  export type SetStateAction<T> = T | ((prev: T) => T)
  export type Dispatch<T> = (value: T) => void

  export function useState<T>(initial: T): [T, Dispatch<SetStateAction<T>>]
  export function useEffect(
    effect: () => void | (() => void),
    inputs?: unknown[],
  ): void
  export function useCallback<T extends (...args: any[]) => any>(
    fn: T,
    inputs: unknown[],
  ): T
  export function useRef<T>(initial: T): { current: T }
}