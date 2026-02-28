package main

import (
	"bufio"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type usageWindowModelAgg struct {
	Input      int     `json:"input"`
	Output     int     `json:"output"`
	CacheRead  int     `json:"cacheRead"`
	CacheWrite int     `json:"cacheWrite"`
	Cost       float64 `json:"cost"`
	Calls      int     `json:"calls"`
}

type rateLimitEvent struct {
	Timestamp string `json:"timestamp"`
	Detail    string `json:"detail"`
	Provider  string `json:"provider,omitempty"`
	Model     string `json:"model,omitempty"`
}

func (s *server) usageWindows(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	now := time.Now().UTC()
	agentsDir := envOrDefault("OPENCLAW_AGENTS_DIR", "/root/.openclaw/agents")
	payload, err := scanOpenClawUsageWindows(agentsDir, now)
	if err != nil {
		log.Printf("usage windows scan failed: %v", err)
		writeJSON(w, http.StatusOK, map[string]any{
			"source":    "openclaw",
			"updatedAt": now.Format(time.RFC3339),
			"error":     "scan failed",
		})
		return
	}
	payload["source"] = "openclaw"
	payload["updatedAt"] = now.Format(time.RFC3339)
	writeJSON(w, http.StatusOK, payload)
}

func (s *server) rateLimitEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	now := time.Now().UTC()
	agentsDir := envOrDefault("OPENCLAW_AGENTS_DIR", "/root/.openclaw/agents")
	events, err := scanOpenClawRateLimitEvents(agentsDir, now, 5*time.Hour)
	if err != nil {
		log.Printf("rate limit scan failed: %v", err)
		events = nil
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"source":    "openclaw",
		"updatedAt": now.Format(time.RFC3339),
		"window":    "5h",
		"events":    events,
	})
}

func scanOpenClawUsageWindows(agentsDir string, now time.Time) (map[string]any, error) {
	// Mirrors the logic in tugcantopaloglu/openclaw-dashboard (server.js getUsageWindows)
	fiveHours := 5 * time.Hour
	oneWeek := 7 * 24 * time.Hour
	cutoffFile := now.Add(-oneWeek)

	paths, err := listRecentSessionJSONLs(agentsDir, cutoffFile)
	if err != nil {
		return nil, err
	}

	perModel5h := map[string]*usageWindowModelAgg{}
	perModelWeek := map[string]*usageWindowModelAgg{}
	type recentMsg struct {
		ts         time.Time
		modelKey   string
		outputTok  int
		cost       float64
		inputTok   int
		cacheRead  int
		cacheWrite int
	}
	var recent []recentMsg

	for _, p := range paths {
		_ = scanOpenClawJSONL(p, func(rec openclawRecord) {
			if rec.Type != "message" || rec.Message == nil || rec.Message.Usage == nil {
				return
			}
			ts, ok := parseOpenClawTimestamp(rec.Timestamp)
			if !ok {
				return
			}
			provider := normalizeProvider(rec.Message.Provider)
			model := normalizeModel(provider, rec.Message.Model)
			modelKey := provider + "/" + model

			usage := rec.Message.Usage
			inTok := max0(usage.Input)
			outTok := max0(usage.Output)
			cacheRead := max0(usage.CacheRead)
			cacheWrite := max0(usage.CacheWrite)
			cost := 0.0
			if usage.Cost != nil {
				cost = usage.Cost.Total
			}

			if now.Sub(ts) <= fiveHours {
				agg := perModel5h[modelKey]
				if agg == nil {
					agg = &usageWindowModelAgg{}
					perModel5h[modelKey] = agg
				}
				agg.Input += inTok
				agg.Output += outTok
				agg.CacheRead += cacheRead
				agg.CacheWrite += cacheWrite
				agg.Cost += cost
				agg.Calls++
				recent = append(recent, recentMsg{ts: ts, modelKey: modelKey, outputTok: outTok, cost: cost, inputTok: inTok, cacheRead: cacheRead, cacheWrite: cacheWrite})
			}
			if now.Sub(ts) <= oneWeek {
				agg := perModelWeek[modelKey]
				if agg == nil {
					agg = &usageWindowModelAgg{}
					perModelWeek[modelKey] = agg
				}
				agg.Input += inTok
				agg.Output += outTok
				agg.CacheRead += cacheRead
				agg.CacheWrite += cacheWrite
				agg.Cost += cost
				agg.Calls++
			}
		})
	}

	sort.Slice(recent, func(i, j int) bool { return recent[i].ts.After(recent[j].ts) })

	var windowStart *time.Time
	if len(recent) > 0 {
		oldest := recent[len(recent)-1].ts
		windowStart = &oldest
	}
	windowResetInMs := int64(0)
	if windowStart != nil {
		reset := windowStart.Add(fiveHours)
		if reset.After(now) {
			windowResetInMs = reset.Sub(now).Milliseconds()
		}
	}

	// burn rate over last 30m (output tokens + cost)
	thirtyMin := now.Add(-30 * time.Minute)
	var recent30 []recentMsg
	for _, m := range recent {
		if m.ts.Before(thirtyMin) {
			break
		}
		recent30 = append(recent30, m)
	}
	burnTokPerMin := 0.0
	burnCostPerMin := 0.0
	if len(recent30) > 0 {
		minTs := recent30[len(recent30)-1].ts
		span := now.Sub(minTs)
		if span < time.Minute {
			span = time.Minute
		}
		totalOut := 0
		totalCost := 0.0
		for _, m := range recent30 {
			totalOut += m.outputTok
			totalCost += m.cost
		}
		burnTokPerMin = float64(totalOut) / (span.Minutes())
		burnCostPerMin = totalCost / (span.Minutes())
	}

	// expose recent calls (latest 20)
	type recentCall struct {
		Timestamp  string  `json:"timestamp"`
		Model      string  `json:"model"`
		Input      int     `json:"input"`
		Output     int     `json:"output"`
		CacheRead  int     `json:"cacheRead"`
		CacheWrite int     `json:"cacheWrite"`
		Cost       float64 `json:"cost"`
		Ago        string  `json:"ago"`
	}
	recentCalls := make([]recentCall, 0, min(len(recent), 20))
	for i := 0; i < len(recent) && i < 20; i++ {
		m := recent[i]
		agoMin := int(math.Round(now.Sub(m.ts).Minutes()))
		if agoMin < 0 {
			agoMin = 0
		}
		recentCalls = append(recentCalls, recentCall{
			Timestamp:  m.ts.Format(time.RFC3339),
			Model:      m.modelKey,
			Input:      m.inputTok,
			Output:     m.outputTok,
			CacheRead:  m.cacheRead,
			CacheWrite: m.cacheWrite,
			Cost:       roundFloat(m.cost, 6),
			Ago:        strconvItoa(agoMin) + "m ago",
		})
	}

	// Convert maps to plain maps for JSON
	pm5 := map[string]usageWindowModelAgg{}
	for k, v := range perModel5h {
		tmp := *v
		tmp.Cost = roundFloat(tmp.Cost, 6)
		pm5[k] = tmp
	}
	pmw := map[string]usageWindowModelAgg{}
	for k, v := range perModelWeek {
		tmp := *v
		tmp.Cost = roundFloat(tmp.Cost, 6)
		pmw[k] = tmp
	}

	out := map[string]any{
		"fiveHour": map[string]any{
			"perModel":      pm5,
			"windowStart":   optionalTime(windowStart),
			"windowResetIn": windowResetInMs,
			"recentCalls":   recentCalls,
		},
		"weekly": map[string]any{
			"perModel": pmw,
		},
		"burnRate": map[string]any{
			"tokensPerMinute": roundFloat(burnTokPerMin, 2),
			"costPerMinute":   roundFloat(burnCostPerMin, 6),
		},
	}
	return out, nil
}

func scanOpenClawRateLimitEvents(agentsDir string, now time.Time, window time.Duration) ([]rateLimitEvent, error) {
	cutoffFile := now.Add(-window)
	paths, err := listRecentSessionJSONLs(agentsDir, cutoffFile)
	if err != nil {
		return nil, err
	}

	var events []rateLimitEvent
	for _, p := range paths {
		_ = scanOpenClawJSONL(p, func(rec openclawRecord) {
			ts, ok := parseOpenClawTimestamp(rec.Timestamp)
			if !ok {
				return
			}
			if now.Sub(ts) > window {
				return
			}

			// Look for rate limit hints in errors or stopReason.
			if rec.Type != "error" && !(rec.Message != nil && strings.EqualFold(rec.Message.StopReason, "rate_limit")) {
				return
			}

			blob, _ := json.Marshal(rec)
			text := strings.ToLower(string(blob))
			if !(strings.Contains(text, "rate") || strings.Contains(text, "overloaded") || strings.Contains(text, "429") || strings.Contains(text, "limit")) {
				return
			}

			detail := string(blob)
			if len(detail) > 240 {
				detail = detail[:240]
			}

			ev := rateLimitEvent{Timestamp: ts.Format(time.RFC3339), Detail: detail}
			if rec.Message != nil {
				ev.Provider = normalizeProvider(rec.Message.Provider)
				ev.Model = normalizeModel(ev.Provider, rec.Message.Model)
			}
			events = append(events, ev)
		})
	}

	sort.Slice(events, func(i, j int) bool { return events[i].Timestamp > events[j].Timestamp })
	if len(events) > 50 {
		events = events[:50]
	}
	return events, nil
}

type openclawRecord struct {
	Type      string `json:"type"`
	Timestamp string `json:"timestamp"`
	Message   *struct {
		Provider   string `json:"provider"`
		Model      string `json:"model"`
		StopReason string `json:"stopReason"`
		Usage      *struct {
			TotalTokens int `json:"totalTokens"`
			Input       int `json:"input"`
			Output      int `json:"output"`
			CacheRead   int `json:"cacheRead"`
			CacheWrite  int `json:"cacheWrite"`
			Cost        *struct {
				Total float64 `json:"total"`
			} `json:"cost"`
		} `json:"usage"`
	} `json:"message"`
}

// scanOpenClawJSONL reads OpenClaw session .jsonl files and calls fn for each parsed record.
func scanOpenClawJSONL(path string, fn func(openclawRecord)) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 2*1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(bytesTrimSpace(line)) == 0 {
			continue
		}
		var rec openclawRecord
		if err := json.Unmarshal(line, &rec); err != nil {
			continue
		}
		fn(rec)
	}
	return scanner.Err()
}

func listRecentSessionJSONLs(agentsDir string, cutoff time.Time) ([]string, error) {
	entries, err := os.ReadDir(agentsDir)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, agent := range entries {
		if !agent.IsDir() {
			continue
		}
		sessionsDir := filepath.Join(agentsDir, agent.Name(), "sessions")
		files, err := os.ReadDir(sessionsDir)
		if err != nil {
			continue
		}
		for _, f := range files {
			if f.IsDir() {
				continue
			}
			name := f.Name()
			if !strings.HasSuffix(name, ".jsonl") {
				continue
			}
			full := filepath.Join(sessionsDir, name)
			info, err := f.Info()
			if err != nil {
				continue
			}
			if info.ModTime().Before(cutoff) {
				continue
			}
			out = append(out, full)
		}
	}
	if len(out) == 0 {
		return out, nil
	}
	return out, nil
}

func parseOpenClawTimestamp(ts string) (time.Time, bool) {
	if strings.TrimSpace(ts) == "" {
		return time.Time{}, false
	}
	parsed, err := time.Parse(time.RFC3339, ts)
	if err != nil {
		return time.Time{}, false
	}
	return parsed.UTC(), true
}

func normalizeProvider(provider string) string {
	p := strings.ToLower(strings.TrimSpace(provider))
	if p == "" {
		return "unknown"
	}
	return p
}

func normalizeModel(provider, model string) string {
	m := strings.TrimSpace(model)
	if m == "" {
		return "unknown"
	}
	p := normalizeProvider(provider)
	pref := p + "/"
	if strings.HasPrefix(strings.ToLower(m), pref) {
		m = m[len(pref):]
	}
	// Keep the raw model string; OpenClaw already includes normalized providers.
	return m
}

func max0(v int) int {
	if v < 0 {
		return 0
	}
	return v
}

func optionalTime(t *time.Time) any {
	if t == nil {
		return nil
	}
	return t.Format(time.RFC3339)
}

func roundFloat(v float64, digits int) float64 {
	pow := math.Pow10(digits)
	return math.Round(v*pow) / pow
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// strconvItoa without importing strconv (main.go already imports it; keep this file lean).
func strconvItoa(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	buf := make([]byte, 0, 12)
	for v > 0 {
		d := v % 10
		buf = append(buf, byte('0'+d))
		v /= 10
	}
	if neg {
		buf = append(buf, '-')
	}
	// reverse
	for i, j := 0, len(buf)-1; i < j; i, j = i+1, j-1 {
		buf[i], buf[j] = buf[j], buf[i]
	}
	return string(buf)
}

func bytesTrimSpace(b []byte) []byte {
	// minimal trim for scanner lines
	start := 0
	for start < len(b) {
		switch b[start] {
		case ' ', '\n', '\r', '\t':
			start++
			continue
		}
		break
	}
	end := len(b)
	for end > start {
		switch b[end-1] {
		case ' ', '\n', '\r', '\t':
			end--
			continue
		}
		break
	}
	return b[start:end]
}
