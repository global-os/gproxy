import type { PropsWithChildren } from 'react'
import { FadingBoxes } from './FadingBoxes'
import { GlobalOsTitle } from './GlobalOsTitle'
import { LogoSection } from './LogoSection'

type Props = { width?: string }

export const VerticalFrame = ({ children, width }: PropsWithChildren<Props>) => (
  <div className="flex justify-center px-4 py-10 sm:py-12">
    <div
      style={{ width }}
      className="max-w-full w-full flex flex-col items-center rounded-2xl bg-white text-gray-900
        shadow-[0_24px_64px_rgba(15,23,42,0.28),0_4px_16px_rgba(15,23,42,0.12)]"
    >
      <LogoSection href="/">
        <FadingBoxes />
        <GlobalOsTitle>GlobalOS</GlobalOsTitle>
      </LogoSection>
      <div className="w-full px-6 sm:px-9 pb-8 sm:pb-9 pt-2 box-border">
        {children}
      </div>
    </div>
  </div>
)
