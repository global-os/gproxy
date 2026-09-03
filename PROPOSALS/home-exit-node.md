# Home exit node — route the sidecar's egress through a self-hosted VPN exit

## Status (2026-09-03)

Proposal only — nothing implemented. Written to validate whether the
residential proxy (its IPs, not the sidecar itself) is the thing getting us
banned, and, if so, to replace that paid dependency with a trusted residential
IP the operator already owns and controls.

## Background

The sidecar already solves the hard half: it drives **real Google Chrome** so
every upstream fetch carries a genuine Chrome JA3/JA4 TLS fingerprint and
behavior (see `SETUP_SIDECAR.md`). The remaining variable is the **IP** — the
sidecar's Hetzner address is datacenter (blocked), so outbound requests egress
through a third-party residential proxy. That proxy is the only part of the
chain we don't control, and the current hypothesis is that its IP pool is
flagged, so every fresh IP still gets banned despite rotation.

Key constraint from `sidecar/server.mjs`: the residential proxy must be reached
through `proxy-chain`'s `anonymizeProxy()` (which holds credentials and
forwards as a local, **unauthenticated** proxy), because an authenticated
proxy + Chrome's own internal proxy-auth handling conflicts with the CDP
`Fetch.enable` interception that makes Origin/Referer/Cookie spoofing work.
The proxy must also be a **pure byte tunnel** — `anonymizeProxy()` does not
terminate TLS, so Chrome's real ClientHello reaches the upstream untouched.
Any home-exit design must preserve both properties (unauthenticated, no TLS
termination) or it reintroduces the exact failures those two decisions already
fixed.

## Goal

Run a VPN exit node on the operator's home machine (where X already works
natively, so the IP is genuinely trusted) and point the sidecar's Chrome at it
instead of the residential proxy. Two outcomes, both valuable:

- **Validation** — if `real Chrome + home exit` works where `real Chrome +
  residential proxy` fails, the ban is isolated to the proxy IPs' reputation,
  and we drop the residential proxy. If it *still* fails, the IP was never the
  problem, and no proxy swap fixes it (fingerprint/Castle iframe detection is
  the real blocker — see `AGENTS.md` webview section).
- **Permanent replacement** — a residential IP we control, with real standing,
  no per-GB cost, no third-party trust.

## The mechanism

Two options, both routing Chrome's egress through a WireGuard tunnel to the
home box. The tunnel is L3 and terminates nothing, so Chrome's TLS handshake
reaches the upstream exactly as it does today through `anonymizeProxy()`.

### Option A — home box as SOCKS5 server (minimal change, recommended)

The home box runs a WireGuard server **and** an unauthenticated SOCKS5 daemon
(SSH `-D`, `microsocks`, `gost`, …) bound to its tunnel address. The sidecar
runs a WireGuard peer; `PROXY_URL` in the admin panel becomes
`socks5://<home-tunnel-ip>:1080`. `server.mjs` is almost unchanged — it already
calls `anonymizeProxy(PROXY_URL)` and hands Chrome
`proxy: { server: <local-anonymous-proxy> }`. Because the upstream SOCKS5 is
unauthenticated, there is no credential/CDP conflict; `anonymizeProxy()` can
either be kept (harmless) or bypassed.

Pros: tiny diff, reuses the admin-panel → `config.mjs` → `anonymizeProxy`
pipeline exactly. Cons: the home box must expose a SOCKS port on the tunnel;
the sidecar's DNS/HTTP still egress normally, only Chrome's proxied traffic
rides the tunnel.

### Option B — policy-routed tunnel (no proxy in Chrome)

The sidecar brings up `wg0` with `AllowedIPs = 0.0.0.0/0` but uses **policy
routing** (fwmark + a separate routing table) so only Chrome's egress traffic
is marked and sent down `wg0`, while the sidecar's own control plane (Vercel
config poll, `/fetch` ingress, MinIO artifact download) stays on the normal
route. Chrome needs no `proxy` at all, or a trivial local SOCKS5 bound to
`wg0`.

Pros: no proxy hop at all, closest to "the server just talks to the pipe."
Cons: policy routing in the container is fiddly and easy to get wrong — a
mis-marked route silently leaks control-plane traffic out the home IP or, worse,
sends Chrome's egress out the datacenter address (the thing we're trying to
avoid). Harder to verify from logs.

Both options are A/B-comparable against the residential proxy: flip
`PROXY_URL` in the admin panel (home exit vs. residential) and the sidecar
polls + restarts within 60s, exactly as it does today.

## Approach (recommended path)

1. **Home box:** WireGuard server (e.g. `wg-quick` / Tailscale-with-exit-node
   semantics, or a raw `wg` config) + an unauthenticated SOCKS5 listener bound
   to the tunnel interface only. Forward the UDP port (or use a rendezvous like
   Tailscale/Headscale to avoid an open port and handle CGNAT).
2. **Sidecar:** add a WireGuard peer config (peer is home box), bring `wg0` up
   at container start, and add a health check that the tunnel address answers.
3. **Sidecar:** set `PROXY_URL = socks5://<home-tunnel-ip>:1080` via the admin
   panel (or, for Option B, drop the proxy and add the routing rules).
4. **Verify:** `/health` should report `proxyOk` (server IP ≠ egress IP, egress
   = home IP). The sidecar's `/admin` IP probe should show the home IP as the
   proxy IP.
5. **A/B:** run the X login flow through home exit, then through the
   residential proxy, comparing `ct0` issuance / "Please use X.com" /
   "temporarily limited" outcomes. The result answers the validation question
   in "Goal".

## Steps, in order

1. Stand up the home exit node and confirm `curl --socks5` through it from the
   sidecar host egresses as the home IP (no proxy, no sidecar code changes yet).
2. Wire the home exit into the sidecar (Option A first — smallest diff), keeping
   the residential proxy configured as a one-field fallback.
3. Confirm `/health` + `/admin` show the home IP and `proxyOk: true`.
4. Run the login A/B against X. Record which side passes.
5. Decide: adopt permanently (remove residential proxy, harden DDNS/uptime) or
   keep residential (validation says IP wasn't the cause).

## Risks / open questions

- **Dynamic home IP / CGNAT** — most home ISPs hand out a changing IP or put
  you behind CGNAT with no inbound port. A rendezvous layer (Tailscale/Headscale
  or a DDNS + UDP keepalive) is effectively mandatory, not optional.
- **Upload bandwidth is the ceiling** — every X page load is proxied out the
  home connection's *upload*. Fine for a validation run; a real risk as the
  permanent production path for many concurrent users.
- **Single point of failure / uptime** — a laptop, a router, or a power cycle
  kills the whole upstream path. The residential proxy at least never sleeps.
- **Policy-routing leakage (Option B only)** — a mis-marked route sends Chrome
  egress out the datacenter IP. Must be verified by the `/admin` IP probe on
  every restart.
- **Tunnel must not terminate TLS** — do not put any MITM in front of Chrome;
  the tunnel is L3 only. Reintroducing termination reproduces the exact
  Node-TLS-fingerprint failure `anonymizeProxy` was chosen to avoid.
- **Trust boundary** — the home box sees all proxied traffic in cleartext after
  the tunnel, same as the residential proxy does today; not a regression, but
  the home box becomes a sensitive host.

## Decision points

- **Option A (SOCKS on the home box) vs Option B (policy routing)** — A for
  the validation run; B only if we later care about removing the proxy hop.
- **Permanent vs diagnostic** — keep the residential proxy configured until the
  A/B result is in; the admin panel already supports flipping the single URL.
- **Rendezvous** — Tailscale/Headscale (least setup, adds a dependency) vs raw
  WireGuard + DDNS (self-contained, more moving parts at the home end).
