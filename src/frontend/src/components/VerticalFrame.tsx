import type { PropsWithChildren } from 'react'
import { FadingBoxes } from './FadingBoxes'
import { GlobalOsTitle } from './GlobalOsTitle'
import { LogoSection } from './LogoSection'

type Props = { width?: string }

export const VerticalFrame = ({ children, width }: PropsWithChildren<Props>) => (
  <div className="flex justify-center mt-10 mb-12">
    <div
      style={{ background: 'rgba(18,4,42,0.82)', width }}
      className="max-w-full flex flex-col items-center rounded-[20px] border border-amber/30 text-white/90
        shadow-[0_32px_80px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(255,255,255,0.03)]"
    >
      <LogoSection href="/">
        <FadingBoxes />
        <GlobalOsTitle>GlobalOS</GlobalOsTitle>
      </LogoSection>
      <div className="w-full px-9 pb-9 pt-6 box-border">
        {children}
      </div>
    </div>
  </div>
)
