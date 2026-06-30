// Platform messaging utility for .gapp apps.
// Vendor this file into your .gapp directory and include it before your app script.
//
// Usage:
//   const id = window.KernelMessaging.nextId()   // e.g. "a3f8c1b2-...-1", "a3f8c1b2-...-2", ...
//   window.parent.postMessage({ type: 'webview:create', requestId: id, domain: 'x.com' }, '*')
//
// The kernel sends a 'visit' message on startup with a server-issued visit ID.
// nextId() blocks until that ID arrives, then returns scoped sequential IDs.

var _visitId = null
var _seq = 0
var _waiters = []

window.KernelMessaging = {
  nextId: function () {
    if (_visitId !== null) return _visitId + '-' + (++_seq)
    // visitId not yet received — callers shouldn't hit this in practice since
    // the kernel sends 'visit' before 'init:fresh'/'init', but handle it anyway
    var n = ++_seq
    return 'pending-' + n
  },
}

window.addEventListener('message', function (event) {
  var data = event.data
  if (!data || typeof data.type !== 'string') return
  if (data.type === 'visit' && typeof data.visitId === 'string' && _visitId === null) {
    _visitId = data.visitId
  }
})
