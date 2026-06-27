type PageProps = React.PropsWithChildren<{
  variant?: 'default' | 'workspace'
}>

export const Page = ({ children, variant = 'default' }: PageProps) => {
  if (variant === 'workspace') {
    return (
      <div className="w-full h-screen overflow-hidden">
        {children}
      </div>
    )
  }

  return (
    <div className="relative w-full min-h-screen overflow-auto">
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(165deg, #3b0764 0%, #6d28d9 45%, #5b21b6 100%)',
          backgroundSize: '100% 100vh',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {children}
    </div>
  )
}
