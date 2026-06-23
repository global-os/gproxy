import { useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const DUR = '0.4s'

interface Props {
  phrases: string[]
  interval?: number
  class?: string
}

export function RotatingText({ phrases, interval = 2500, class: className }: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const span0Ref = useRef<HTMLSpanElement>(null)
  const span1Ref = useRef<HTMLSpanElement>(null)
  const measurerRef = useRef<HTMLSpanElement>(null)
  const currentRef = useRef(0)
  const indexRef = useRef(0)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const [animateWidth, setAnimateWidth] = useState(false)

  const spanRefs = [span0Ref, span1Ref]

  function measure(text: string): number {
    const wrap = wrapRef.current
    const measurer = measurerRef.current
    if (!wrap || !measurer) return 0
    const cs = getComputedStyle(wrap)
    measurer.style.fontSize = cs.fontSize
    measurer.style.fontWeight = cs.fontWeight
    measurer.style.fontFamily = cs.fontFamily
    measurer.style.letterSpacing = cs.letterSpacing
    measurer.textContent = text
    return measurer.getBoundingClientRect().width
  }

  function tick() {
    const prev = currentRef.current
    const next = 1 - prev
    currentRef.current = next

    const phrase = phrases[indexRef.current % phrases.length]
    indexRef.current++

    const prevSpan = spanRefs[prev].current
    const nextSpan = spanRefs[next].current
    if (!prevSpan || !nextSpan) return

    nextSpan.textContent = phrase
    nextSpan.style.transition = 'none'
    nextSpan.style.transform = 'translateY(120%)'

    setWidth(measure(phrase))

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        prevSpan.style.transition = `transform ${DUR} ${EASE}`
        prevSpan.style.transform = 'translateY(-120%)'
        nextSpan.style.transition = `transform ${DUR} ${EASE}`
        nextSpan.style.transform = 'translateY(0)'
      })
    )
  }

  useEffect(() => {
    tick()
    let id: ReturnType<typeof setInterval>
    const t = setTimeout(() => {
      setAnimateWidth(true)
      id = setInterval(tick, interval)
    }, 50)
    return () => {
      clearTimeout(t)
      clearInterval(id)
    }
  }, [])

  const wrapStyle: JSX.CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    overflow: 'hidden',
    verticalAlign: 'bottom',
    height: '1.25em',
    width: width !== undefined ? `${width}px` : undefined,
    transition: animateWidth ? `width ${DUR} ${EASE}` : 'none',
  }

  const innerStyle: JSX.CSSProperties = {
    display: 'block',
    position: 'absolute',
    top: 0,
    left: 0,
    whiteSpace: 'nowrap',
  }

  return (
    <>
      <span ref={wrapRef} class={className} style={wrapStyle}>
        <span ref={span0Ref} style={innerStyle} />
        <span ref={span1Ref} style={innerStyle} />
      </span>
      <span
        ref={measurerRef}
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' }}
        aria-hidden="true"
      />
    </>
  )
}
