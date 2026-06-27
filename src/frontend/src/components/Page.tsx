export const Page = ({ children }: React.PropsWithChildren) => (
  <div
    className="w-full min-h-screen overflow-auto"
    style={{ background: 'linear-gradient(165deg, #1e40af 0%, #2563eb 45%, #1d4ed8 100%)' }}
  >
    {children}
  </div>
)
