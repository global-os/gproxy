import { createComponent } from 'react-fela'
import { Animations } from '../types/animations'
import { AnimationContext } from '../contexts/animation'

const Container = createComponent(() => ({
  position: 'relative',

  '--scale': '140px',
  '--duration': '10s',

  width: 'calc(var(--scale) * 2)',
  height: 'calc(var(--scale) * 5/4)',

  '>:nth-child(1)': {
    animationDelay: 'calc(var(--duration) * -1/3)'
  },
  '>:nth-child(2)': {
    animationDelay: 'calc(var(--duration) * -2/3)'
  },
  '>:nth-child(3)': {
    animationDelay: 'calc(var(--duration) * -3/3)'
  },
}))

const FadingBox = createComponent(({ animations }: { animations: Animations }) => ({
  boxSizing: 'border-box',

  backgroundColor: 'rgba(196,181,253,0.12)',
  border: 'calc(var(--scale) * 0.09) solid rgba(221,214,254,0.45)',
  boxShadow: '0 0 24px rgba(167,139,250,0.2)',
  transform: 'skew(-8deg)',
  width: 'var(--scale)',
  height: 'calc(var(--scale) * 3/4)',
  position: 'absolute',
  animationName: animations.fadingBoxes,
  animationDuration: 'var(--duration)',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
}))


export const FadingBoxes = () => {
  // animationName: animations.fadingBoxes,
  // animationDuration: '2s'

  return <Container>
    <AnimationContext.Consumer>
      {(animations: Animations | null) => {
        return (
          <>
            <FadingBox animations={animations!} />
            <FadingBox animations={animations!} />
            <FadingBox animations={animations!} />
          </>
        )
      }}
    </AnimationContext.Consumer>
  </Container>
}