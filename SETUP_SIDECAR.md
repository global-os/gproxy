# Sidecar setup (Vultr)

The sidecar is a Go HTTP server that makes upstream requests with Chrome 131's TLS fingerprint, bypassing Cloudflare Bot Management's JA3/JA4 detection. It lives in `sidecar/` and runs on a cheap Vultr VM.

## 1. Create the VM

In the Vultr dashboard:
- **Type:** Cloud Compute — Shared CPU
- **Plan:** vc2-1c-2gb (1 vCPU, 2GB RAM) — smallest available is fine
- **OS:** Ubuntu 24.04 LTS
- **Region:** anything close to Vercel's `iad1` (US East) to minimize latency — New Jersey or Atlanta work well
- Add your SSH key

## 2. Install Docker

```bash
ssh root@<vultr-ip>
curl -fsSL https://get.docker.com | sh
```

## 3. Clone the repo and build

```bash
git clone https://github.com/global-os/proxy
cd proxy
docker build -t proxy-sidecar ./sidecar/
```

First build takes ~5 minutes (downloads Go deps). Subsequent builds are faster due to layer caching.

## 4. Run the sidecar

Pick a strong random secret (e.g. `openssl rand -hex 32`) and keep it — you'll need it for Vercel too.

```bash
docker run -d \
  --restart=always \
  -p 8080:8080 \
  -e SIDECAR_SECRET=<your-secret> \
  --name proxy-sidecar \
  proxy-sidecar
```

Verify it's running:

```bash
curl http://localhost:8080/health
# => ok

docker logs proxy-sidecar
# => [sidecar] listening :8080  profile=Chrome_131  auth=true
```

## 5. Add env vars to Vercel

In the Vercel dashboard → Project → Settings → Environment Variables (add to Production and Preview):

| Key | Value |
|-----|-------|
| `SIDECAR_URL` | `http://<vultr-ip>:8080` |
| `SIDECAR_SECRET` | same secret as above |

Then redeploy for the vars to take effect.

## 6. Verify end-to-end

After deploy, check the Vercel function logs for:
```
[webview] TLS sidecar active: http://<vultr-ip>:8080
```

Then open a webview (X, Instagram) and confirm `ct0` is no longer being deleted on page load.

## Updating after code changes

```bash
ssh root@<vultr-ip>
cd ~/proxy
git pull
docker build -t proxy-sidecar ./sidecar/
docker stop proxy-sidecar && docker rm proxy-sidecar
docker run -d \
  --restart=always \
  -p 8080:8080 \
  -e SIDECAR_SECRET=<your-secret> \
  --name proxy-sidecar \
  proxy-sidecar
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `docker build` fails with `requires go >= 1.24.1` | Dockerfile must use `golang:1.24-bookworm` — pull latest and rebuild |
| Vercel logs show `sidecar 502` | Check VM firewall allows port 8080 inbound; `docker logs proxy-sidecar` for errors |
| `ct0` still deleted | Confirm `SIDECAR_URL` is set and the redeploy picked it up; check for `TLS sidecar active` in logs |
| Sidecar unreachable from Vercel | Vultr firewall may be blocking port 8080 — add a rule to allow TCP 8080 from anywhere |
