var loadingEl = document.getElementById('loading')
var loadingMsg = document.getElementById('loading-msg')
var errorMsg = document.getElementById('error-msg')
var frame = document.getElementById('webview-frame')

var pendingRequestId = null

function showError(msg) {
  console.error('[dropbox.gapp] error:', msg)
  if (loadingMsg) loadingMsg.style.display = 'none'
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

  if (data.type === 'init:fresh' || data.type === 'init') {
    if (data.type === 'init' && data.proxyOrigin) {
      showFrame(data.proxyOrigin)
      return
    }
    pendingRequestId = window.KernelMessaging.nextId()
    window.parent.postMessage({ type: 'webview:create', requestId: pendingRequestId, domain: 'dropbox.com' }, '*')
    return
  }

  if (data.type === 'webview:create:complete' && data.requestId === pendingRequestId) {
    window.parent.postMessage({
      type: 'save',
      filename: '.webview-state',
      content: JSON.stringify({ webviewId: data.webviewId }),
      webviewId: data.webviewId,
      domain: data.domain,
      proxyOrigin: data.proxyOrigin,
    }, '*')
    showFrame(data.proxyOrigin)
    return
  }

  if (data.type === 'webview:create:error' && data.requestId === pendingRequestId) {
    showError(data.message || 'Failed to connect')
    return
  }
})

console.log('[dropbox.gapp] loaded, sending ready')
window.parent.postMessage({ type: 'ready' }, '*')
