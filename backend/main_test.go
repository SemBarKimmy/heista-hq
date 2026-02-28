package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestHealthEndpoint(t *testing.T) {
	s := &server{}
	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	s.health(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

func TestCORSAllowsKnownOrigin(t *testing.T) {
	h := withCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.Header.Set("Origin", "https://heista-dev.vercel.app")
	w := httptest.NewRecorder()

	h.ServeHTTP(w, r)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://heista-dev.vercel.app" {
		t.Fatalf("expected Access-Control-Allow-Origin to be set, got %q", got)
	}
}

func TestTokenUsageEndpoint_SumsTokensFromSessionLogs(t *testing.T) {
	tmp := t.TempDir()
	agentsDir := filepath.Join(tmp, "agents")
	sessionsDir := filepath.Join(agentsDir, "arga", "sessions")
	if err := os.MkdirAll(sessionsDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	now := time.Now().UTC()
	inWindow := now.Add(-30 * time.Minute).Format(time.RFC3339)
	outWindow := now.Add(-3 * time.Hour).Format(time.RFC3339)

	jsonl := "" +
		`{"type":"message","timestamp":"` + inWindow + `","message":{"usage":{"totalTokens":123}}}` + "\n" +
		`{"type":"message","timestamp":"` + inWindow + `","message":{"usage":{"totalTokens":7}}}` + "\n" +
		`{"type":"message","timestamp":"` + outWindow + `","message":{"usage":{"totalTokens":999}}}` + "\n"
	if err := os.WriteFile(filepath.Join(sessionsDir, "session.jsonl"), []byte(jsonl), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	os.Setenv("OPENCLAW_AGENTS_DIR", agentsDir)
	t.Cleanup(func() { _ = os.Unsetenv("OPENCLAW_AGENTS_DIR") })

	s := &server{}
	r := httptest.NewRequest(http.MethodGet, "/api/token-usage?hours=1", nil)
	w := httptest.NewRecorder()

	s.tokenUsage(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json response: %v", err)
	}
	if payload["source"] != "openclaw" {
		t.Fatalf("expected source=openclaw, got %v", payload["source"])
	}
	if got := int(payload["usedTokens"].(float64)); got != 130 {
		t.Fatalf("expected usedTokens=130, got %d", got)
	}
}

func TestVPSEndpoint(t *testing.T) {
	s := &server{}
	r := httptest.NewRequest(http.MethodGet, "/api/vps", nil)
	w := httptest.NewRecorder()

	s.vps(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json response: %v", err)
	}
	if _, ok := payload["cpuPercent"]; !ok {
		t.Fatal("expected cpuPercent in payload")
	}
	if _, ok := payload["ramPercent"]; !ok {
		t.Fatal("expected ramPercent in payload")
	}
	if _, ok := payload["diskPercent"]; !ok {
		t.Fatal("expected diskPercent in payload")
	}
}
