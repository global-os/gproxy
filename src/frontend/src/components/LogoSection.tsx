export const LogoSection = ({
  children,
  href,
}: React.PropsWithChildren<{ href: string }>) => (
  <a
    href={href}
    className="pt-7 pb-4 px-4 flex flex-col items-center no-underline text-gray-900 hover:text-gray-900"
  >
    {children}
  </a>
)
