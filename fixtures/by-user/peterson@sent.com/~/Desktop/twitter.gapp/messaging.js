// Platform messaging utility for .gapp apps.
// Vendor this file into your .gapp directory and include it before your app script.
//
// Usage:
//   const id = window.KernelMessaging.nextId()   // e.g. "a3f8c1b2-1", "a3f8c1b2-2", ...
//   window.parent.postMessage({ type: 'webview:create', requestId: id, domain: 'x.com' }, '*')
//
// The visit ID prefix is captured automatically from the kernel's init/init:fresh message,
// so IDs are unique per page load without any manual setup.

;(function (global) {
  var _visitId = null
  var _seq = 0

  global.KernelMessaging = {
    nextId: function () {
      return (_visitId != null ? _visitId : 'v') + '-' + (++_seq)
    },
  }

  global.addEventListener('message', function (event) {
    var data = event.data
    if (!data || typeof data.type !== 'string') return
    if ((data.type === 'init' || data.type === 'init:fresh') && typeof data.visitId === 'string') {
      if (_visitId === null) _visitId = data.visitId
    }
  })
})(window)
