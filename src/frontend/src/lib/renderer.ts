import { createRenderer as felaCreateRenderer } from 'fela'
import embedded from 'fela-plugin-embedded'
import prefixer from 'fela-plugin-prefixer'
import fallbackValue from 'fela-plugin-fallback-value'
import unit from 'fela-plugin-unit'
import perf from 'fela-perf'
import beautifier from 'fela-beautifier'
import sortMediaQueryMobileFirst from 'fela-sort-media-query-mobile-first'
import { Animations } from '../types/animations'

const createRenderer = () => {
  const enhancers = [sortMediaQueryMobileFirst()]
  if (import.meta.env.DEV) {
    enhancers.unshift(beautifier())
  }

  const renderer = felaCreateRenderer({
    plugins: [embedded(), unit(), prefixer(), fallbackValue()],
    enhancers,
  })

  const fadingBoxes = () => ({
    '0%': {
      transform: 'translate(0,0)',
      opacity: 0,
    },
    '50%': {
      opacity: 1,
    },
    '100%': {
      transform: 'translate(100%,75%)',
      opacity: 0,
    },
  })

  const animations: Animations = {
    fadingBoxes: renderer.renderKeyframe(fadingBoxes, {}),
  }

  renderer.renderStatic(
    {
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    'html,body,#app'
  )

  return {
    renderer,
    animations,
  }
}

export default createRenderer
