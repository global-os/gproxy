# Sidecar setup (Hetzner / mainframe-2)

The sidecar makes upstream requests through a **real Google Chrome** instance (driven by [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-nodejs), a stealth-patched Playwright fork), bypassing Cloudflare Bot Management's JA3/JA4 TLS fingerprinting and behavioral detection. It lives in `sidecar/` and runs on the Hetzner VM `mainframe-2`, managed declaratively through the `petersweb-infra` NixOS repo — see "Deployment" below before touching anything by hand.

To fully bypass X/Instagram detection you need **both**:
- **Sidecar** — real Chrome (genuine JA3/JA4, no impersonation needed since it's the real thing)
- **Residential proxy** — non-datacenter IP (Hetzner IPs are blocked the same as Vercel/AWS)

The request chain is: **Vercel → sidecar (real Chrome, via CDP) → residential proxy → upstream**

## Why real Chrome, not TLS impersonation

An earlier version of this sidecar used `tls-client` (a Go library impersonating Chrome's TLS ClientHello) instead of a real browser. It worked for basic pages but eventually got blocked on X's login flow ("Please use X.com or official X apps" / `ct0` CSRF cookie zeroed). Local testing (Patchright POC, see git history around the sidecar rewrite) isolated the requirements precisely:

| Browser | Mode | Result |
|---|---|---|
| Real Google Chrome | headed | pass |
| Real Google Chrome | headless, default UA (`HeadlessChrome/...`) | **blocked** |
| Real Google Chrome | headless, UA with "Headless" stripped | pass |
| Playwright's bundled Chromium | headed or headless | **blocked regardless of UA** |

Conclusions:
- **Real Google Chrome is required** — Chromium (even headed, even with an identical spoofed UA) gets detected by something other than headers (Widevine CDM presence and/or `navigator.userAgentData` brand list are the leading suspects, not confirmed further).
- **Headless is fine** — no Xvfb/virtual display needed — as long as the UA string doesn't contain the literal substring `"Headless"`. This was the actual, surprisingly simple, root cause of the block in headless mode.
- WebGL renderer, `userAgentData.brands`, plugins, and codec support were all identical between the passing headed run and the failing headless run on the same machine — ruling out GPU/rendering fingerprinting as the mechanism.

### The CDP header-spoofing wrinkle

The webview proxy (`src/runtime/webview/proxy.ts`) deliberately rewrites `Origin`/`Referer` to the bound domain (e.g. `https://x.com`) so upstream doesn't see our proxy subdomain — this is core to how cross-domain embedding works at all. Real browsers refuse to let page JS set these via `fetch()` (they're "forbidden headers"). `server.mjs` works around this by triggering the request from a normal `fetch()` call inside the page, then intercepting it at the **CDP `Fetch` domain** — which sits below the browser's own JS-level header restrictions — and overriding headers there via `Fetch.continueRequest`. See the comment block at the top of `sidecar/server.mjs` for the full mechanism, including how redirects are handled (`redirect: 'manual'` + a server-side follow loop, to avoid ambiguous request-correlation across hops).

Two real bugs came out of getting this CDP approach working, both worth knowing about if you touch `chromeFetchOnce`:

1. **A custom correlation header triggers CORS preflight.** The original design shared one page across all `/fetch` calls, correlating each in-flight request via a custom `x-sidecar-correlation-id` header injected into the trigger `fetch()`. Any custom header on a cross-origin `fetch()` forces a CORS preflight (OPTIONS), and real upstreams don't grant CORS permission for a made-up header — so the browser aborted the *real* request after the preflight was rejected, and the correlation Promise just hung until timeout. Fixed by giving every `/fetch` call its own page + CDP session (no correlation header needed at all) and never adding custom headers to the trigger `fetch()` call.
2. **`event.requestStage` isn't a real field.** Despite what the CDP docs imply, `Fetch.requestPaused` events don't actually carry a `requestStage` key in practice (confirmed by dumping `Object.keys(event)` directly) — every event was silently taking the wrong branch. The reliable signal is whether `responseStatusCode` (or `responseErrorReason`) is present on the event at all.

### The authenticated-proxy + CDP conflict

Once `PROXY_URL` is set, every request hung indefinitely (not just for X — reproduced with a plain `api.ipify.org` GET, confirming it wasn't site-specific). The request-stage event fires and `continueRequest` succeeds, but the response-stage event never arrives, no matter how long you wait (tested to 60s+). Root cause: Chrome/Playwright appears to handle authenticated (username/password) upstream proxy credentials via its own internal CDP-level interception, which conflicts with our separate `Fetch.enable` — a known category of problem in the Puppeteer/Playwright scraping community. Fixed with `proxy-chain`: it spins up a local anonymous proxy that forwards to the real authenticated upstream, so Chrome connects with zero credentials and never engages its own internal proxy-auth handling, leaving our `Fetch` domain interception as the only thing touching the request lifecycle. See `proxyLaunchOption()` in `sidecar/server.mjs`.

`server.mjs` now logs per-request activity (start, completion with status/timing, and any CDP-level errors) — it used to log nothing beyond startup and the IP probe, which made the above bugs invisible from `podman logs` alone (a hung request produced zero server-side output, only the *caller's* eventual 502). If you're debugging a new hang, check the logs for `[sidecar] done ...` (success) vs. a `TIMEOUT` line with `sawAnyEvent` telling you whether the request stage even fired.

## Deployment

**This is the important part — read before touching the VM directly.**

The sidecar is deployed via CI on a **Gitea mirror**, not by hand and not via GitHub Actions:

- GitHub (`git@github.com:global-os/proxy.git`, `origin` remote) stays the primary repo — Vercel deploys from here, `.github/workflows/vercel-health-check.yml` is unaffected.
- A mirror lives on the same Gitea forge as `petersweb-infra`: `forge.quinefoundation.com/Cold-Air-Networks/proxy` (`gitea` remote). Push there (`git push gitea main`) to trigger the sidecar build — pushing to GitHub `origin` alone does **not** build/deploy the sidecar.

Flow, once pushed to the `gitea` remote:

1. `sidecar/**` changes on `main` → Gitea Actions (`.gitea/workflows/sidecar-build.yml`, modeled on `customer-riverside`'s CI) builds the image (`linux/amd64` — Google Chrome has no Linux ARM64 build, and `mainframe-2` is x86_64) using `podman` inside a `quay.io/podman/stable` container, and pushes it to the forge's own container registry: `forge.quinefoundation.com/cold-air-networks/proxy-sidecar`.
2. The same workflow opens a PR against `petersweb-infra` bumping the pinned `@sha256:...` digest in `nixos/linux.nix`'s `virtualisation.oci-containers.containers."proxy-sidecar"` block.
3. Once that PR is reviewed and merged, running `nixos-rebuild switch` (or `./apply.sh`) on `mainframe-2` pulls the new pinned image and restarts the container.

**Required Gitea Actions secrets** (on the `Cold-Air-Networks/proxy` mirror repo, not GitHub): `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `INFRA_TOKEN` — same names/purpose as `customer-riverside`'s existing CI, so if those are already configured as org-level secrets on this Gitea instance, no new setup may be needed.

There is **no vendored copy of the sidecar source in `petersweb-infra` anymore** (the old `nixos/proxy-sidecar/` directory holding a copy of `Dockerfile`/`main.go` was removed) and **no local `podman build` on the host** — the NixOS config just references the pinned forge-registry image directly. Don't reintroduce either of those; if you're editing container internals, edit `sidecar/` in this repo and push to the `gitea` remote to let CI handle the rest.

## Local development / testing

You don't need the Hetzner VM to iterate on the sidecar. Real Chrome must be installed locally (`npx patchright install chrome`), then:

```bash
cd sidecar
npm install
node server.mjs
# in another terminal:
curl -X POST http://localhost:8080/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.ipify.org","method":"GET","headers":[]}'
```

Set `PROXY_URL` and `SIDECAR_SECRET` env vars to match production behavior. To test cross-platform builds locally on an ARM Mac (e.g. before pushing), use `podman build --platform linux/amd64 .` — plain `podman build` will fail on ARM64 since Chrome doesn't ship for that architecture, and even a successful cross-arch build may crash at runtime under local QEMU emulation (ptrace/GPU sandbox issues) — that's an emulation artifact, not a real bug; it'll behave normally on actual x86_64 hardware.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Build fails: `not supported on Linux Arm64` | You're building on an ARM host without `--platform linux/amd64` — Chrome has no Linux ARM64 build. CI always builds `linux/amd64` explicitly. |
| Vercel logs show `sidecar 502` | Check `mainframe-2` firewall allows port 8080 inbound; `podman logs proxy-sidecar` for errors |
| `ct0` still deleted / "Please use X.com" error | Check the sidecar's startup log confirms `engine=chrome(patchright)`; confirm `PROXY_URL` is set and `ipProbe.proxyOk` is true in `/health` |
| Request hangs / times out | Check `podman logs proxy-sidecar` for a `TIMEOUT` line — `sawAnyEvent=false` means the request never even reached Chrome's network stack (page/context issue); `sawAnyEvent=true` with no `done` line means the response-stage CDP event never arrived (this is exactly the authenticated-proxy conflict above if `PROXY_URL` is set — confirm `proxyLaunchOption()` is using `proxy-chain`, not passing credentials to Playwright directly) |
| Every request hangs the full 20s once `PROXY_URL` is set, but works fine without it | The authenticated-proxy + CDP conflict — see above. Confirm the startup log shows `[sidecar] anonymized proxy at http://127.0.0.1:...` (proxy-chain running) rather than Playwright being handed the upstream URL with credentials directly |
| Sidecar unreachable from Vercel | `mainframe-2` firewall may be blocking port 8080 |
| New sidecar code not showing up in production | Confirm the CI-opened PR against `petersweb-infra` was merged, and `nixos-rebuild switch` was actually run on `mainframe-2` afterward — merging the PR alone doesn't deploy anything |
