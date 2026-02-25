package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
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

func TestTokenUsageEndpoint(t *testing.T) {
	s := &server{}
	r := httptest.NewRequest(http.MethodGet, "/api/token-usage", nil)
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
}
