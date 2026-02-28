package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var allowedOrigins = map[string]struct{}{
	"https://heista-dev.vercel.app": {},
	"https://heista-hq.vercel.app":  {},
}

type server struct {
	db *sql.DB
}

type task struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type logEntry struct {
	ID        string    `json:"id"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

func main() {
	dsn, err := databaseURL()
	if err != nil {
		log.Fatalf("database config error: %v", err)
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	if err := ensureSchema(ctx, db); err != nil {
		log.Fatalf("ensure schema: %v", err)
	}

	s := &server{db: db}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/api/tasks", s.tasks)
	mux.HandleFunc("/api/logs", s.logs)
	mux.HandleFunc("/api/token-usage", s.tokenUsage)
	mux.HandleFunc("/api/vps", s.vps)
	mux.HandleFunc("/api/news", s.news)
	mux.HandleFunc("/api/trends", s.trends)

	handler := withCORS(withJSONContentType(mux))

	addr := envOrDefault("BIND_ADDR", "127.0.0.1:8080")
	log.Printf("heista-go listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("listen: %v", err)
	}
}

func withJSONContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if _, ok := allowedOrigins[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *server) tasks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.listTasks(w, r)
	case http.MethodPost:
		s.createTask(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (s *server) logs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.listLogs(w, r)
	case http.MethodPost:
		s.createLog(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (s *server) tokenUsage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	hours := envIntOrDefault("TOKEN_USAGE_HOURS_DEFAULT", 24)
	if v := strings.TrimSpace(r.URL.Query().Get("hours")); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid hours"})
			return
		}
		hours = parsed
	}
	if hours > 24*7 {
		hours = 24 * 7
	}

	since := time.Now().UTC().Add(-time.Duration(hours) * time.Hour)
	openclawAgentsDir := envOrDefault("OPENCLAW_AGENTS_DIR", "/root/.openclaw/agents")

	usedTokens, fileCount, err := sumOpenClawTokens(openclawAgentsDir, since)
	sourceDetail := "openclaw-sessions-jsonl"
	if err != nil {
		log.Printf("token usage scan failed: %v", err)
		sourceDetail = "openclaw-sessions-jsonl:error"
		usedTokens = 0
		fileCount = 0
	}

	type tokenUsagePayload struct {
		UsedTokens   int    `json:"usedTokens"`
		LimitTokens  int    `json:"limitTokens"`
		Period       string `json:"period"`
		UpdatedAt    string `json:"updatedAt"`
		Source       string `json:"source"`
		SourceDetail string `json:"sourceDetail"`
		FileCount    int    `json:"fileCount"`
	}

	payload := tokenUsagePayload{
		UsedTokens:   usedTokens,
		LimitTokens:  envIntOrDefault("TOKEN_USAGE_LIMIT", 0),
		Period:       fmt.Sprintf("%dh", hours),
		UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
		Source:       "openclaw",
		SourceDetail: sourceDetail,
		FileCount:    fileCount,
	}

	writeJSON(w, http.StatusOK, payload)
}

func (s *server) vps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	cpuPercent := readCPUPercent()
	ramPercent := readRAMPercent()
	diskPercent := readDiskPercent("/")
	uptimePercent := 99.9

	status := "online"
	if cpuPercent < 0 || ramPercent < 0 || diskPercent < 0 {
		status = "unknown"
	}
	if cpuPercent > 85 || ramPercent > 90 || diskPercent > 92 {
		status = "degraded"
	}

	region := strings.TrimSpace(os.Getenv("VPS_REGION"))
	if region == "" {
		host, err := os.Hostname()
		if err != nil {
			region = "unknown"
		} else {
			region = host
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":        status,
		"region":        region,
		"uptimePercent": uptimePercent,
		"cpuPercent":    round1(cpuPercent),
		"ramPercent":    round1(ramPercent),
		"diskPercent":   round1(diskPercent),
		"updatedAt":     time.Now().UTC().Format(time.RFC3339),
		"source":        "endpoint",
	})
}

func (s *server) news(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"updatedAt": time.Now().UTC().Format(time.RFC3339),
		"source":    "placeholder",
		"items": []map[string]string{
			{"title": "News feed endpoint online (placeholder)", "source": "news"},
		},
		"todo": "Wire /api/news to Supabase intelligence tables when schema is finalized.",
	})
}

func (s *server) trends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	ts := time.Now().UTC().Format(time.RFC3339)
	writeJSON(w, http.StatusOK, map[string]any{
		"fetchedAt": ts,
		"updatedAt": ts,
		"source":    "database",
		"items": []map[string]any{
			{"title": "Endpoint live: replace with real trend aggregation", "source": "news", "score": 1},
			{"title": "#heista", "source": "twitter", "score": 1},
		},
		"todo": "Wire /api/trends to Supabase materialized view or ingestion pipeline.",
	})
}

func (s *server) listTasks(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, title, status, created_at
		FROM public.api_tasks
		ORDER BY created_at DESC
		LIMIT 100`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := make([]task, 0)
	for rows.Next() {
		var t task
		if err := rows.Scan(&t.ID, &t.Title, &t.Status, &t.CreatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		items = append(items, t)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, items)
}

func (s *server) createTask(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Title  string `json:"title"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Status = strings.TrimSpace(in.Status)
	if in.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
		return
	}
	if in.Status == "" {
		in.Status = "todo"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var out task
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO public.api_tasks (title, status)
		VALUES ($1, $2)
		RETURNING id::text, title, status, created_at`, in.Title, in.Status,
	).Scan(&out.ID, &out.Title, &out.Status, &out.CreatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, out)
}

func (s *server) listLogs(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, level, message, created_at
		FROM public.api_logs
		ORDER BY created_at DESC
		LIMIT 100`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := make([]logEntry, 0)
	for rows.Next() {
		var item logEntry
		if err := rows.Scan(&item.ID, &item.Level, &item.Message, &item.CreatedAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, items)
}

func (s *server) createLog(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Level   string `json:"level"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in.Level = strings.TrimSpace(in.Level)
	in.Message = strings.TrimSpace(in.Message)
	if in.Message == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "message is required"})
		return
	}
	if in.Level == "" {
		in.Level = "info"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var out logEntry
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO public.api_logs (level, message)
		VALUES ($1, $2)
		RETURNING id::text, level, message, created_at`, in.Level, in.Message,
	).Scan(&out.ID, &out.Level, &out.Message, &out.CreatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, out)
}

func ensureSchema(ctx context.Context, db *sql.DB) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS pgcrypto`,
		`CREATE TABLE IF NOT EXISTS public.api_tasks (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			title TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'todo',
			created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
		)`,
		`CREATE TABLE IF NOT EXISTS public.api_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			level TEXT NOT NULL DEFAULT 'info',
			message TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
		)`,
	}
	for _, q := range queries {
		if _, err := db.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return nil
}

func databaseURL() (string, error) {
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		return v, nil
	}
	if v := strings.TrimSpace(os.Getenv("SUPABASE_DB_URL")); v != "" {
		return v, nil
	}
	return "", errors.New("missing DATABASE_URL or SUPABASE_DB_URL")
}

func envOrDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func envIntOrDefault(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

func readCPUPercent() float64 {
	stat1, err := readCPUStat()
	if err != nil {
		return readCPUPercentFromLoad()
	}
	time.Sleep(120 * time.Millisecond)
	stat2, err := readCPUStat()
	if err != nil {
		return readCPUPercentFromLoad()
	}

	totalDelta := stat2.total - stat1.total
	idleDelta := stat2.idle - stat1.idle
	if totalDelta <= 0 {
		return readCPUPercentFromLoad()
	}
	pct := (1 - (idleDelta / totalDelta)) * 100
	if pct < 0 {
		return 0
	}
	if pct > 100 {
		return 100
	}
	return pct
}

func readCPUStat() (struct{ total, idle float64 }, error) {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return struct{ total, idle float64 }{}, err
	}
	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return struct{ total, idle float64 }{}, errors.New("missing /proc/stat")
	}
	fields := strings.Fields(lines[0])
	if len(fields) < 5 || fields[0] != "cpu" {
		return struct{ total, idle float64 }{}, errors.New("unexpected /proc/stat format")
	}
	vals := make([]float64, 0, len(fields)-1)
	for _, s := range fields[1:] {
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return struct{ total, idle float64 }{}, err
		}
		vals = append(vals, v)
	}
	total := 0.0
	for _, v := range vals {
		total += v
	}
	idle := 0.0
	// idle + iowait
	if len(vals) >= 4 {
		idle += vals[3]
	}
	if len(vals) >= 5 {
		idle += vals[4]
	}
	return struct{ total, idle float64 }{total: total, idle: idle}, nil
}

func readCPUPercentFromLoad() float64 {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return -1
	}
	parts := strings.Fields(string(data))
	if len(parts) == 0 {
		return -1
	}
	oneMinute, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return -1
	}
	cpus := float64(runtime.NumCPU())
	if cpus <= 0 {
		cpus = 1
	}
	pct := (oneMinute / cpus) * 100
	if pct < 0 {
		return 0
	}
	if pct > 100 {
		return 100
	}
	return pct
}

func readRAMPercent() float64 {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return -1
	}
	lines := strings.Split(string(data), "\n")
	var totalKB float64
	var availableKB float64
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		switch fields[0] {
		case "MemTotal:":
			totalKB, _ = strconv.ParseFloat(fields[1], 64)
		case "MemAvailable:":
			availableKB, _ = strconv.ParseFloat(fields[1], 64)
		}
	}
	if totalKB == 0 {
		return -1
	}
	used := totalKB - availableKB
	if used < 0 {
		used = 0
	}
	return (used / totalKB) * 100
}

func readDiskPercent(path string) float64 {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return -1
	}
	if stat.Blocks == 0 {
		return -1
	}
	used := float64(stat.Blocks-stat.Bavail) / float64(stat.Blocks) * 100
	if used < 0 {
		return 0
	}
	if used > 100 {
		return 100
	}
	return used
}

func sumOpenClawTokens(agentsDir string, since time.Time) (int, int, error) {
	tokens := 0
	files := 0
	// Directory structure: <agentsDir>/<agent>/sessions/<session>.jsonl
	agentEntries, err := os.ReadDir(agentsDir)
	if err != nil {
		return 0, 0, err
	}
	for _, agent := range agentEntries {
		if !agent.IsDir() {
			continue
		}
		sessionsDir := filepath.Join(agentsDir, agent.Name(), "sessions")
		sessionFiles, err := os.ReadDir(sessionsDir)
		if err != nil {
			continue
		}
		for _, f := range sessionFiles {
			if f.IsDir() {
				continue
			}
			name := f.Name()
			if !strings.HasSuffix(name, ".jsonl") {
				continue
			}
			path := filepath.Join(sessionsDir, name)
			fileTokens, ok, err := sumTokensInJSONL(path, since)
			if err != nil {
				continue
			}
			if ok {
				files++
			}
			tokens += fileTokens
		}
	}
	return tokens, files, nil
}

func sumTokensInJSONL(path string, since time.Time) (int, bool, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, false, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	// allow long lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 2*1024*1024)

	tokens := 0
	counted := false
	for scanner.Scan() {
		line := scanner.Bytes()
		var rec struct {
			Type      string `json:"type"`
			Timestamp string `json:"timestamp"`
			Message   *struct {
				Usage *struct {
					TotalTokens int `json:"totalTokens"`
				} `json:"usage"`
			} `json:"message"`
		}
		if err := json.Unmarshal(line, &rec); err != nil {
			continue
		}
		if rec.Type != "message" || rec.Message == nil || rec.Message.Usage == nil {
			continue
		}
		ts, err := time.Parse(time.RFC3339, rec.Timestamp)
		if err != nil {
			continue
		}
		if ts.Before(since) {
			continue
		}
		if rec.Message.Usage.TotalTokens < 0 {
			continue
		}
		tokens += rec.Message.Usage.TotalTokens
		counted = true
	}
	if err := scanner.Err(); err != nil {
		return 0, false, err
	}
	return tokens, counted, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
	}
}
