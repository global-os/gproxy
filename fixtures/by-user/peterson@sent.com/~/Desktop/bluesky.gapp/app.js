var loadingEl = document.getElementById('loading')
var errorMsg = document.getElementById('error-msg')
var frame = document.getElementById('webview-frame')

var pendingRequestId = null

function showError(msg) {
  console.error('[bluesky.gapp] error:', msg)
  if (loadingEl) loadingEl.style.display = 'none'
  if (errorMsg) { errorMsg.textContent = msg; errorMsg.style.display = 'block' }
}

function showFrame(origin) {
  if (loadingEl) loadingEl.style.display = 'none'
  if (frame) {
    frame.src = origin + '/'
    frame.style.display = 'block'
  }
}

window.addEventListener('message', function(event) {
  var data = event.data
  if (!data || typeof data.type !== 'string') return

  if (data.type === 'init:fresh') {
    pendingRequestId = window.KernelMessaging.nextId()
    window.parent.postMessage({ type: 'webview:create', requestId: pendingRequestId, domain: 'bsky.app' }, '*')
    return
  }

  if (data.type === 'webview:create:complete' && data.requestId === pendingRequestId) {
    showFrame(data.proxyOrigin)
    return
  }

  if (data.type === 'webview:create:error' && data.requestId === pendingRequestId) {
    showError(data.message || 'Failed to connect')
    return
  }
})

console.log('[bluesky.gapp] loaded, sending ready')
window.parent.postMessage({ type: 'ready' }, '*')
