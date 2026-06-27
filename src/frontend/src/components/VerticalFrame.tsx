import { PropsWithChildren } from 'react'
import { createComponent } from 'react-fela'
import { FadingBoxes } from './FadingBoxes'
import { GlobalOsTitle } from './GlobalOsTitle'
import { LogoSection } from './LogoSection'

const BoxContainer = createComponent(() => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  marginTop: '2.5em',
  marginBottom: '3em',
}))

const Box = createComponent(({ width }: { width?: string }) => ({
  width,
  maxWidth: '100%',
  border: '1px solid rgba(200,128,0,0.3)',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  fontSize: '1rem',
  background: 'rgba(18,4,42,0.82)',
  backgroundClip: 'padding-box',
  color: 'rgba(255,255,255,0.9)',
  boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset',
}))

const BottomSection = createComponent(() => ({
  width: '100%',
  padding: '1.5em 2.25em 2.25em',
  boxSizing: 'border-box' as const,
}))

type Props = {
  width?: string
}

export const VerticalFrame = ({ children, width }: PropsWithChildren & Props) => {
  return (
    <BoxContainer>
      <Box width={width}>
        <LogoSection href="/">
          <FadingBoxes />
          <GlobalOsTitle>GlobalOS</GlobalOsTitle>
        </LogoSection>
        <BottomSection>{children}</BottomSection>
      </Box>
    </BoxContainer>
  )
}
