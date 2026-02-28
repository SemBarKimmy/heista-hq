package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/pquerna/otp/totp"
)

const (
	defaultListenAddr = "127.0.0.1:8080"
)

// GenerateMFASecret generates a new TOTP secret for a user
func GenerateMFASecret(userEmail string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "HeistaHQ",
		AccountName: userEmail,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// VerifyMFAToken verifies a TOTP token against a secret
func VerifyMFAToken(secret, token string) bool {
	return totp.Validate(token, secret)
}

type app struct {
	httpClient *http.Client
	supabase   *supabaseConfig
}

type supabaseConfig struct {
	baseURL        string
	serviceRoleKey string
}

func newApp() *app {
	cfg, err := loadSupabaseConfig()
	if err != nil {
		log.Printf("supabase disabled: %v", err)
	}

	return &app{
		httpClient: &http.Client{Timeout: 20 * time.Second},
		supabase:   cfg,
	}
}

func loadSupabaseConfig() (*supabaseConfig, error) {
	baseURL := strings.TrimSpace(os.Getenv("SUPABASE_URL"))
	serviceRoleKey := strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_ROLE_KEY"))

	if baseURL == "" || serviceRoleKey == "" {
		return nil, errors.New("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set")
	}

	baseURL = strings.TrimSuffix(baseURL, "/")
	if _, err := url.ParseRequestURI(baseURL); err != nil {
		return nil, fmt.Errorf("invalid SUPABASE_URL: %w", err)
	}

	return &supabaseConfig{baseURL: baseURL, serviceRoleKey: serviceRoleKey}, nil
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.healthHandler)
	mux.HandleFunc("/api/logs", a.logsHandler)
	mux.HandleFunc("/api/tasks", a.tasksHandler)
	return a.withCORS(mux)
}

func (a *app) healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *app) logsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.proxySupabaseGet(w, "agent_logs", r.URL.Query().Get("select"))
	case http.MethodPost:
		a.proxySupabasePost(w, "agent_logs", r.Body)
	default:
		methodNotAllowed(w)
	}
}

func (a *app) tasksHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.proxySupabaseGet(w, "tasks", r.URL.Query().Get("select"))
	case http.MethodPost:
		a.proxySupabasePost(w, "tasks", r.Body)
	default:
		methodNotAllowed(w)
	}
}

func (a *app) proxySupabaseGet(w http.ResponseWriter, table, selectQuery string) {
	if a.supabase == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "supabase is not configured"})
		return
	}

	if selectQuery == "" {
		selectQuery = "*"
	}

	endpoint := fmt.Sprintf("%s/rest/v1/%s?select=%s", a.supabase.baseURL, table, url.QueryEscape(selectQuery))
	resp, err := a.doSupabaseRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	copyResponse(w, resp.StatusCode, body)
}

func (a *app) proxySupabasePost(w http.ResponseWriter, table string, body io.Reader) {
	if a.supabase == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "supabase is not configured"})
		return
	}

	payload, err := io.ReadAll(body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	var validate json.RawMessage
	if err := json.Unmarshal(payload, &validate); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "request body must be valid JSON"})
		return
	}

	endpoint := fmt.Sprintf("%s/rest/v1/%s", a.supabase.baseURL, table)
	resp, err := a.doSupabaseRequest(http.MethodPost, endpoint, payload)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	copyResponse(w, resp.StatusCode, respBody)
}

func (a *app) doSupabaseRequest(method, endpoint string, payload []byte) (*http.Response, error) {
	var body io.Reader
	if payload != nil {
		body = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("cannot build request: %w", err)
	}

	req.Header.Set("apikey", a.supabase.serviceRoleKey)
	req.Header.Set("Authorization", "Bearer "+a.supabase.serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if method == http.MethodPost {
		req.Header.Set("Prefer", "return=representation")
	}

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("supabase request failed")
	}

	return resp, nil
}

func (a *app) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func isAllowedOrigin(origin string) bool {
	origin = strings.ToLower(strings.TrimSpace(origin))
	if origin == "" {
		return false
	}

	allowed := map[string]bool{
		"http://localhost:3000":      true,
		"http://localhost:5173":      true,
		"https://heista-hq.vercel.app": true,
	}
	if allowed[origin] {
		return true
	}

	return strings.HasPrefix(origin, "https://") && strings.HasSuffix(origin, ".vercel.app")
}

func methodNotAllowed(w http.ResponseWriter) {
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

func copyResponse(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func main() {
	a := newApp()
	log.Printf("heista-go backend listening on %s", defaultListenAddr)
	if err := http.ListenAndServe(defaultListenAddr, a.routes()); err != nil {
		log.Fatal(err)
	}
}
