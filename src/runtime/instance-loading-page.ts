export function instanceLoadingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Loading…</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: #0f1115;
      color: #e8eaed;
      font: 14px/1.5 system-ui, sans-serif;
    }
    #status {
      margin: 0;
      font-size: 15px;
    }

    #error {
      margin: 0;
      font-size: 12px;
      color: #f28b82;
      max-width: 24em;
      text-align: center;
      display: none;
    }
  </style>
</head>
<body>
  <p id="status">Preparing app…</p>
  <p id="error"></p>
  <script>
    (function () {
      var statusEl = document.getElementById('status')
      var errorEl = document.getElementById('error')
      var pollMs = 500

      function setMessage(message, error) {
        if (statusEl) statusEl.textContent = message || 'Preparing app…'
        if (errorEl) {
          if (error) {
            errorEl.textContent = error
            errorEl.style.display = 'block'
          } else {
            errorEl.textContent = ''
            errorEl.style.display = 'none'
          }
        }
      }

      async function poll() {
        try {
          var res = await fetch('/_status', { credentials: 'include' })
          if (!res.ok) {
            setMessage('Waiting for server…')
            return
          }
          var data = await res.json()
          if (data.ready) {
            setMessage('Starting app…')
            location.reload()
            return
          }
          if (data.stage === 'failed') {
            setMessage(data.message || 'Failed to start app', data.error || 'Unknown error')
            return
          }
          setMessage(data.message || 'Preparing app…')
        } catch (_err) {
          setMessage('Reconnecting…')
        }
      }

      void poll()
      setInterval(function () { void poll() }, pollMs)
    })()
  </script>
</body>
</html>`
}