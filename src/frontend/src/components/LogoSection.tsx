export const LogoSection = ({
  children,
  href,
}: React.PropsWithChildren<{ href: string }>) => (
  <a
    href={href}
    className="w-full pt-7 pb-5 px-4 flex flex-col items-center no-underline rounded-t-2xl"
    style={{
      background: 'linear-gradient(165deg, #2e1065 0%, #4c1d95 42%, #6d28d9 100%)',
    }}
  >
    {children}
  </a>
)
