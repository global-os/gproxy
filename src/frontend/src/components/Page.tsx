export const Page = ({ children }: React.PropsWithChildren) => (
  <div className="w-full min-h-screen overflow-auto" style={{ background: '#14002d' }}>
    {children}
  </div>
)
