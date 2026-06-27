import { createComponent } from 'react-fela'
import version from '../build-version.json'

const Stamp = createComponent(() => ({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: '10px',
  textAlign: 'center',
  fontSize: '11px',
  lineHeight: 1.4,
  color: 'rgba(255, 255, 255, 0.45)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 9999,
}))

export function VersionStamp() {
  return <Stamp>{version.label}</Stamp>
}