import { createComponent } from "react-fela";

export const LogoSection = createComponent(() => ({
  padding: '1.75em 1em 1em',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textDecoration: 'none',
  color: 'rgba(255,255,255,0.8)',
  ':hover': {
    color: 'rgba(255,255,255,0.8)',
  },
}), 'a', ['href'])
