import { PropsWithChildren } from 'react'
import { createComponent } from 'react-fela'
import { FadingBoxes } from './FadingBoxes'
import { GlobalOsTitle } from './GlobalOsTitle'
import { LogoSection } from './LogoSection'

const Box = createComponent(() => ({
  display: 'flex',
  justifyContent: 'center',
  margin: '0 auto',
  fontSize: '1rem',
  marginTop: '1em',
}))

const color = 'rgb(200, 128, 0)'

const LeftSection = createComponent(
  () => ({
    background: '#ddd',
    border: '3px double ' + color,
    backgroundClip: 'padding-box',
    'border-right': 0,
  }),
  LogoSection,
  ['href']
)

const RightSection = createComponent(() => ({
  color: '#333',
  background: '#ddd',
  border: '3px double ' + color,
  'border-left': 0,
  backgroundClip: 'padding-box',
}))

export const HorizontalFrame = ({ children }: PropsWithChildren) => {
  return (
    <Box>
      <LeftSection href="/">
        <FadingBoxes />
        <GlobalOsTitle>GlobalOS</GlobalOsTitle>
      </LeftSection>
      <RightSection>{children}</RightSection>
    </Box>
  )
}
