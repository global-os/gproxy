package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

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

var (
	secret   = os.Getenv("SIDECAR_SECRET")
	proxyURL = os.Getenv("PROXY_URL")
)

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

	opts := []tls_client.HttpClientOption{
		tls_client.WithClientProfile(profiles.Chrome_131),
		tls_client.WithTimeoutSeconds(30),
	}
	if proxyURL != "" {
		opts = append(opts, tls_client.WithProxyUrl(proxyURL))
	}
	// New client per request — no session state bleeds between proxy requests.
	client, err := tls_client.NewHttpClient(tls_client.NewNoopLogger(), opts...)
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

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/fetch", handleFetch)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok")) //nolint:errcheck
	})

	log.Printf("[sidecar] listening :%s  profile=Chrome_131  auth=%v  proxy=%v", port, secret != "", proxyURL != "")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
