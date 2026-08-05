import { render } from 'preact'
import { RotatingText } from './RotatingText'

const mount = document.getElementById('rotating-mount')
if (mount) {
  render(
    <RotatingText
      phrases={['public computers', 'your laptop', 'your phone', 'the cloud']}
      class="text-white font-medium"
      onReady={() => {
        document.getElementById('hero-line')?.classList.remove('opacity-0')
      }}
    />,
    mount
  )
}
