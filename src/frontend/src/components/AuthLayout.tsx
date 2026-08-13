import type { PropsWithChildren } from 'react'
import { Link } from '@tanstack/react-router'

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export const authInputCls =
  'w-full px-3 py-2.5 text-sm font-semibold border border-indigo-300/15 rounded-md bg-[rgba(36,33,45,0.55)] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/60'

export const authLabelCls = 'text-sm font-medium text-gray-300'

export const authButtonCls =
  'w-full py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-teal-500/75 to-violet-600/75 hover:from-teal-400/85 hover:to-violet-500/85 rounded-md transition-colors cursor-pointer border-0 text-center no-underline inline-block'

export const authSecondaryButtonCls =
  'w-full py-2.5 px-4 text-sm font-semibold text-violet-300 bg-white/5 border border-violet-400/30 hover:bg-violet-400/10 rounded-md transition-colors cursor-pointer text-center no-underline inline-block'

export const authLinkCls =
  'text-sm text-violet-400 hover:text-violet-300 font-medium no-underline'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(167, 139, 250, 0.22), transparent 65%), linear-gradient(to bottom, #322c44, #201c2b)',
      }}
    >
      <header className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-violet-400 no-underline hover:text-violet-300"
          >
            GlobalOS
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  )
}

export function AuthCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'w-full max-w-md backdrop-blur-sm rounded-lg shadow-[0_2px_40px_rgba(139,92,246,0.16)] border border-indigo-300/25 px-8 py-8',
        className
      )}
      style={{
        backgroundImage:
          'radial-gradient(circle at 30% 0%, rgba(147, 155, 246, 0.12), transparent 60%), linear-gradient(to bottom, rgba(78, 76, 86, 0.9), rgba(60, 58, 68, 0.92))',
      }}
    >
      {children}
    </div>
  )
}
