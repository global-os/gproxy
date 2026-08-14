var loadingEl = document.getElementById('loading')
var loadingMsg = document.getElementById('loading-msg')
var errorMsg = document.getElementById('error-msg')
var frame = document.getElementById('webview-frame')

var pendingRequestId = null

function showError(msg) {
  console.error('[twitter.gapp] error:', msg)
  if (loadingMsg) loadingMsg.style.display = 'none'
  if (errorMsg) {
    errorMsg.textContent = msg
    errorMsg.style.display = 'block'
  }
}

function showFrame(origin) {
  if (loadingEl) loadingEl.style.display = 'none'
  if (frame) {
    frame.src = origin + '/'
    frame.style.display = 'block'
  }
}

window.addEventListener('message', function (event) {
  var data = event.data
  if (!data || typeof data.type !== 'string') return

  console.log('[twitter.gapp] received message:', data.type, data)

  if (data.type === 'init:fresh' || data.type === 'init') {
    if (data.type === 'init' && data.proxyOrigin) {
      showFrame(data.proxyOrigin)
      return
    }
    pendingRequestId = window.KernelMessaging.nextId()
    console.log(
      '[twitter.gapp] sending webview:create, requestId:',
      pendingRequestId
    )
    window.parent.postMessage(
      {
        type: 'webview:create',
        requestId: pendingRequestId,
        domain: 'x.com',
        // Per-webview rules (stored as webview_rule rows, evaluated in order):
        rules: [
          // X's chunks hardcode the abs.twimg.com CDN origin; rewrite it to a
          // proxy-relative path so they load through the proxy instead of a
          // second time straight from the CDN (which blanked the page).
          {
            match: { domain: 'abs.twimg.com' },
            action: {
              type: 'rewrite-origin',
              from: 'https://abs.twimg.com',
              to: '/abs.twimg.com',
            },
          },
          // Show a loading overlay on the first HTML load, hidden once the
          // username/email input becomes focusable (or after a 4s fallback).
          {
            match: { path: '/' },
            action: {
              type: 'append',
              html:
                '<style>#gproxy-loading{position:fixed;inset:0;background:#15202b;color:#e7e9ea;display:flex;align-items:center;justify-content:center;z-index:99999;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}</style>' +
                '<div id="gproxy-loading">Loading…</div>' +
                '<script>(function(){var e=document.getElementById("gproxy-loading");if(!e)return;var t=Date.now();function hide(){if(e.parentNode)e.parentNode.removeChild(e)}' +
                'function ready(){var l=document.querySelectorAll("input");for(var k=0;k<l.length;k++){var i=l[k];if((i.name==="username_or_email"||(i.getAttribute("autocomplete")||"").indexOf("username")===0)&&!i.disabled&&i.getBoundingClientRect().width>0)return true}return false}' +
                'var iv=setInterval(function(){if(ready()&&Date.now()-t>300){clearInterval(iv);hide()}},100);' +
                'window.addEventListener("load",function(){setTimeout(function(){clearInterval(iv);hide()},4000)})})()</script>',
            },
          },
        ],
      },
      '*'
    )
    return
  }

  if (
    data.type === 'webview:create:complete' &&
    data.requestId === pendingRequestId
  ) {
    showFrame(data.proxyOrigin)
    return
  }

  if (
    data.type === 'webview:create:error' &&
    data.requestId === pendingRequestId
  ) {
    showError(data.message || 'Failed to connect')
    return
  }
})

console.log('[twitter.gapp] loaded, sending ready')
window.parent.postMessage({ type: 'ready' }, '*')
