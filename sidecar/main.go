package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	fhttp "github.com/bogdanfinn/fhttp"
	tls_client "github.com/bogdanfinn/tls-client"
	"github.com/bogdanfinn/tls-client/profiles"
)

// FetchReq is the JSON body expected by POST /fetch.
// Headers is a list of [name, value] pairs (allows duplicates, preserves order).
// Body is base64-encoded; omit or set to "" for requests with no body.
type FetchReq struct {
	URL     string      `json:"url"`
	Method  string      `json:"method"`
	Headers [][2]string `json:"headers"`
	Body    string      `json:"body"`
}

type FetchResp struct {
	Status  int         `json:"status"`
	Headers [][2]string `json:"headers"`
	Body    string      `json:"body"` // base64-encoded
}

type IPProbe struct {
	ServerIP    string `json:"serverIp"`
	ProxyIP     string `json:"proxyIp"`
	ProxyOk     bool   `json:"proxyOk"` // true if proxy is active and IPs differ
	Checked     bool   `json:"checked"` // false until probe completes
	ServerError string `json:"serverError,omitempty"`
	ProxyError  string `json:"proxyError,omitempty"`
}

var (
	secret      = os.Getenv("SIDECAR_SECRET")
	proxyURL    = os.Getenv("PROXY_URL")
	ipProbe     IPProbe
	ipProbeMu   sync.RWMutex
)

func newClient(withProxy bool) (tls_client.HttpClient, error) {
	opts := []tls_client.HttpClientOption{
		tls_client.WithClientProfile(profiles.Chrome_131),
		tls_client.WithTimeoutSeconds(15),
	}
	if withProxy && proxyURL != "" {
		opts = append(opts, tls_client.WithProxyUrl(proxyURL))
	}
	return tls_client.NewHttpClient(tls_client.NewNoopLogger(), opts...)
}

func fetchPublicIP(withProxy bool) (string, error) {
	client, err := newClient(withProxy)
	if err != nil {
		return "", err
	}
	req, err := fhttp.NewRequest("GET", "https://api.ipify.org", nil)
	if err != nil {
		return "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(body)), nil
}

// probeIPs runs at startup in a goroutine. Fetches the server's own public IP
// (direct) and the IP seen by upstream when going through the residential proxy.
// If they differ, the proxy is routing correctly.
func probeIPs() {
	serverIP, err1 := fetchPublicIP(false)
	proxyIP, err2 := fetchPublicIP(true)

	probe := IPProbe{Checked: true}
	if err1 == nil {
		probe.ServerIP = serverIP
	} else {
		probe.ServerError = err1.Error()
		log.Printf("[sidecar] ip-probe direct failed: %v", err1)
	}
	if err2 == nil {
		probe.ProxyIP = proxyIP
	} else {
		probe.ProxyError = err2.Error()
		log.Printf("[sidecar] ip-probe proxy failed: %v", err2)
	}
	probe.ProxyOk = proxyURL != "" && err1 == nil && err2 == nil && serverIP != proxyIP

	ipProbeMu.Lock()
	ipProbe = probe
	ipProbeMu.Unlock()

	log.Printf("[sidecar] ip-probe: serverIp=%s proxyIp=%s proxyOk=%v", probe.ServerIP, probe.ProxyIP, probe.ProxyOk)
}

func handleFetch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if secret != "" && r.Header.Get("Authorization") != "Bearer "+secret {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req FetchReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
		return
	}

	var bodyBytes []byte
	if req.Body != "" {
		var err error
		bodyBytes, err = base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			http.Error(w, "invalid body base64: "+err.Error(), http.StatusBadRequest)
			return
		}
	}

	// New client per request — no session state bleeds between proxy requests.
	client, err := newClient(true)
	if err != nil {
		http.Error(w, "client error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var bodyReader io.Reader
	if len(bodyBytes) > 0 {
		bodyReader = bytes.NewReader(bodyBytes)
	}

	// tls-client uses its own fhttp fork — must use fhttp.NewRequest, not net/http.
	upReq, err := fhttp.NewRequest(req.Method, req.URL, bodyReader)
	if err != nil {
		http.Error(w, "invalid request: "+err.Error(), http.StatusBadRequest)
		return
	}
	for _, h := range req.Headers {
		upReq.Header.Set(h[0], h[1])
	}

	resp, err := client.Do(upReq)
	if err != nil {
		http.Error(w, "fetch error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "read error: "+err.Error(), http.StatusBadGateway)
		return
	}

	// Collect all response headers; preserve multiple Set-Cookie values as
	// separate pairs so the caller can append them without comma-joining.
	var respHeaders [][2]string
	for name, values := range resp.Header {
		for _, v := range values {
			respHeaders = append(respHeaders, [2]string{name, v})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(FetchResp{
		Status:  resp.StatusCode,
		Headers: respHeaders,
		Body:    base64.StdEncoding.EncodeToString(respBody),
	}); err != nil {
		log.Printf("[sidecar] encode error: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	ipProbeMu.RLock()
	probe := ipProbe
	ipProbeMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{ //nolint:errcheck
		"ok":          true,
		"proxyActive": proxyURL != "",
		"ipProbe":     probe,
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	go probeIPs()

	http.HandleFunc("/fetch", handleFetch)
	http.HandleFunc("/health", handleHealth)

	log.Printf("[sidecar] listening :%s  profile=Chrome_131  auth=%v  proxy=%v", port, secret != "", proxyURL != "")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
