import { Fzf } from 'fzf'
import { useQuery } from '@tanstack/react-query'
import { createComponent } from 'react-fela'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

export const TASKBAR_HEIGHT = 40

export type FileIndexEntry = {
  type: 'directory' | 'file'
  id: number
  name: string
  path: string
  mime_type?: string
  launchable: boolean
}

const retroFont =
  'Tahoma, "MS Sans Serif", "Segoe UI", ui-sans-serif, system-ui, sans-serif'

const outsetBorder = {
  borderWidth: '2px',
  borderStyle: 'solid',
  borderTopColor: '#ffffff',
  borderLeftColor: '#ffffff',
  borderBottomColor: '#808080',
  borderRightColor: '#808080',
}

const insetBorder = {
  borderWidth: '2px',
  borderStyle: 'solid',
  borderTopColor: '#808080',
  borderLeftColor: '#808080',
  borderBottomColor: '#ffffff',
  borderRightColor: '#ffffff',
}

const Bar = createComponent(() => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: `${TASKBAR_HEIGHT}px`,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 4px',
  background: '#c0c0c0',
  boxSizing: 'border-box',
  ...outsetBorder,
  borderLeft: 'none',
  borderRight: 'none',
  borderBottom: 'none',
  zIndex: 50,
  fontFamily: retroFont,
}))

const StartButton = createComponent(({ active }: { active?: boolean }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '30px',
  padding: '0 10px',
  fontFamily: retroFont,
  fontSize: '12px',
  fontWeight: 700,
  color: '#000000',
  background: '#c0c0c0',
  cursor: 'pointer',
  ...(active ? insetBorder : outsetBorder),
  ':active': {
    ...insetBorder,
    paddingTop: '1px',
    paddingLeft: '11px',
  },
}), 'button', ['type', 'onClick'])

const MenuPanel = createComponent(() => ({
  position: 'absolute',
  left: '4px',
  bottom: `${TASKBAR_HEIGHT + 4}px`,
  width: 'min(420px, calc(100vw - 16px))',
  display: 'flex',
  flexDirection: 'column',
  background: '#c0c0c0',
  padding: '3px',
  boxSizing: 'border-box',
  ...outsetBorder,
  boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
  zIndex: 60,
}))

const MenuHeader = createComponent(() => ({
  padding: '6px 8px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#ffffff',
  background: 'linear-gradient(90deg, #4c1d95 0%, #7c3aed 55%, #4c1d95 100%)',
  marginBottom: '4px',
}))

const SearchField = createComponent(() => ({
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: retroFont,
  fontSize: '12px',
  padding: '5px 6px',
  marginTop: '4px',
  background: '#ffffff',
  color: '#000000',
  outline: 'none',
  ...insetBorder,
}), 'input', ['type', 'value', 'onChange', 'onKeyDown', 'placeholder', 'spellCheck', 'autoComplete', 'aria-label'])

const Results = createComponent(() => ({
  maxHeight: '280px',
  overflowY: 'auto',
  background: '#ffffff',
  ...insetBorder,
}))

const ResultRow = createComponent(({ active }: { active?: boolean }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
  padding: '5px 8px',
  cursor: 'pointer',
  background: active ? '#000080' : '#ffffff',
  color: active ? '#ffffff' : '#000000',
  fontFamily: retroFont,
  fontSize: '12px',
  userSelect: 'none',
}), 'button', ['type', 'onClick', 'onMouseEnter'])

const ResultName = createComponent(() => ({
  fontWeight: 700,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
}))

const ResultPath = createComponent(({ active }: { active?: boolean }) => ({
  fontSize: '10px',
  opacity: active ? 0.85 : 0.65,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textAlign: 'left',
}))

const Hint = createComponent(() => ({
  padding: '8px',
  fontSize: '11px',
  color: '#444444',
  fontFamily: retroFont,
}))

const Spacer = createComponent(() => ({
  flex: '1 1 auto',
}))

const Clock = createComponent(() => ({
  height: '30px',
  padding: '0 10px',
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: retroFont,
  fontSize: '12px',
  color: '#000000',
  background: '#c0c0c0',
  ...insetBorder,
}))

type Props = {
  onLaunchApp: (entry: FileIndexEntry) => void
}

function entryLabel(entry: FileIndexEntry): string {
  return `${entry.path} ${entry.name}`
}

export function Taskbar({ onLaunchApp }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [clock, setClock] = useState(() => new Date())
  const inputRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: entries = [], isLoading } = useQuery<FileIndexEntry[]>({
    queryKey: ['file-index'],
    queryFn: async () => {
      const r = await fetch('/api/fs/index', { credentials: 'include' })
      if (!r.ok) throw new Error(`Failed to load file index (${r.status})`)
      const body = (await r.json()) as { entries: FileIndexEntry[] }
      return body.entries
    },
    staleTime: 30_000,
  })

  const fzf = useMemo(
    () => new Fzf(entries, { selector: entryLabel }),
    [entries],
  )

  const results = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      return entries
        .filter((entry) => entry.launchable || entry.type === 'file')
        .slice(0, 12)
    }
    return fzf.find(trimmed).slice(0, 12).map((result) => result.item)
  }, [entries, fzf, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [menuOpen])

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      if ((target as Element).closest?.('[data-taskbar-start]')) return
      setMenuOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const activate = useCallback((entry: FileIndexEntry) => {
    if (entry.launchable) {
      onLaunchApp(entry)
      setMenuOpen(false)
      setQuery('')
      return
    }
  }, [onLaunchApp])

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const entry = results[activeIndex]
      if (entry) activate(entry)
    }
  }

  const timeLabel = clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <>
      {menuOpen && (
        <MenuPanel innerRef={panelRef}>
          <MenuHeader>Find a file or app</MenuHeader>
          <Results>
            {isLoading && <Hint>Loading file index…</Hint>}
            {!isLoading && results.length === 0 && (
              <Hint>{query.trim() ? 'No matches' : 'No files indexed'}</Hint>
            )}
            {results.map((entry, index) => {
              const active = index === activeIndex
              return (
                <ResultRow
                  key={`${entry.type}-${entry.id}`}
                  type="button"
                  active={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(entry)}
                >
                  <ResultName>
                    {entry.launchable ? '◆ ' : entry.type === 'directory' ? '📁 ' : '📄 '}
                    {entry.name}
                  </ResultName>
                  <ResultPath active={active}>{entry.path}</ResultPath>
                </ResultRow>
              )
            })}
          </Results>
          <SearchField
            innerRef={(el: HTMLInputElement | null) => { inputRef.current = el }}
            type="text"
            placeholder="Type to search…"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={onSearchKeyDown}
            spellCheck={false}
            autoComplete="off"
            aria-label="Search files"
          />
        </MenuPanel>
      )}
      <Bar>
        <StartButton
          type="button"
          data-taskbar-start=""
          active={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden>◆</span>
          <span>Start</span>
        </StartButton>
        <Spacer />
        <Clock aria-label="Current time">{timeLabel}</Clock>
      </Bar>
    </>
  )
}