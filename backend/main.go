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
	"sort"
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
	ID          string     `json:"id"`
	ColumnID    string     `json:"column_id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Order       int        `json:"order"`
	AssignedTo  *string    `json:"assigned_to,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty"`
}

type logEntry struct {
	ID        string         `json:"id"`
	AgentID   string         `json:"agent_id"`
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
}

func main() {
	var db *sql.DB
	if dsn, err := databaseURL(); err != nil {
		// Some environments (like lightweight VPS deployments) may run read-only
		// dashboard endpoints without a database configured.
		log.Printf("database disabled: %v", err)
	} else {
		opened, err := sql.Open("pgx", dsn)
		if err != nil {
			log.Fatalf("open db: %v", err)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := opened.PingContext(ctx); err != nil {
			opened.Close()
			log.Printf("db ping failed (continuing without db): %v", err)
		} else if err := ensureSchema(ctx, opened); err != nil {
			opened.Close()
			log.Printf("ensure schema failed (continuing without db): %v", err)
		} else {
			db = opened
			defer db.Close()
		}
	}

	s := &server{db: db}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.health)
	mux.HandleFunc("/api/tasks", s.tasks)
	mux.HandleFunc("/api/tasks/", s.taskByID)
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
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Type")
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

func (s *server) taskByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	id = strings.Trim(id, "/")
	if id == "" {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	switch r.Method {
	case http.MethodPatch:
		s.updateTask(w, r, id)
	case http.MethodDelete:
		s.deleteTask(w, r, id)
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

	usedTokens, fileCount, breakdown, err := sumOpenClawTokens(openclawAgentsDir, since)
	sourceDetail := "openclaw-sessions-jsonl"
	if err != nil {
		log.Printf("token usage scan failed: %v", err)
		sourceDetail = "openclaw-sessions-jsonl:error"
		usedTokens = 0
		fileCount = 0
		breakdown = map[providerModelKey]int{}
	}

	type tokenUsagePayload struct {
		UsedTokens   int                  `json:"usedTokens"`
		LimitTokens  int                  `json:"limitTokens"`
		Period       string               `json:"period"`
		UpdatedAt    string               `json:"updatedAt"`
		Source       string               `json:"source"`
		SourceDetail string               `json:"sourceDetail"`
		FileCount    int                  `json:"fileCount"`
		Breakdown    []providerModelUsage `json:"breakdown"`
	}

	usages := make([]providerModelUsage, 0, len(breakdown))
	for k, v := range breakdown {
		usages = append(usages, providerModelUsage{Provider: k.Provider, Model: k.Model, UsedTokens: v})
	}
	sort.Slice(usages, func(i, j int) bool { return usages[i].UsedTokens > usages[j].UsedTokens })

	payload := tokenUsagePayload{
		UsedTokens:   usedTokens,
		LimitTokens:  envIntOrDefault("TOKEN_USAGE_LIMIT", 0),
		Period:       fmt.Sprintf("%dh", hours),
		UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
		Source:       "openclaw",
		SourceDetail: sourceDetail,
		FileCount:    fileCount,
		Breakdown:    usages,
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
	if s.db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database not configured"})
		return
	}

	columnIDsParam := strings.TrimSpace(r.URL.Query().Get("columnIds"))
	columnIDs := make([]string, 0)
	if columnIDsParam != "" {
		for _, part := range strings.Split(columnIDsParam, ",") {
			v := strings.TrimSpace(part)
			if v != "" {
				columnIDs = append(columnIDs, v)
			}
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	query := `
		SELECT id::text, column_id, title, description, "order", assigned_to, created_at, updated_at
		FROM public.api_tasks`
	args := make([]any, 0)
	if len(columnIDs) > 0 {
		placeholders := make([]string, 0, len(columnIDs))
		for i, id := range columnIDs {
			args = append(args, id)
			placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		}
		query += fmt.Sprintf(" WHERE column_id IN (%s)", strings.Join(placeholders, ","))
	}
	query += ` ORDER BY column_id, "order" ASC, created_at ASC LIMIT 500`

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := make([]task, 0)
	for rows.Next() {
		var t task
		if err := rows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Order, &t.AssignedTo, &t.CreatedAt, &t.UpdatedAt); err != nil {
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
	if s.db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database not configured"})
		return
	}

	var in struct {
		Title       string  `json:"title"`
		ColumnID    string  `json:"column_id"`
		Description *string `json:"description"`
		Order       *int    `json:"order"`
		AssignedTo  *string `json:"assigned_to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	in.ColumnID = strings.TrimSpace(in.ColumnID)
	if in.Description != nil {
		d := strings.TrimSpace(*in.Description)
		in.Description = &d
	}
	if in.AssignedTo != nil {
		a := strings.TrimSpace(*in.AssignedTo)
		in.AssignedTo = &a
	}

	if in.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
		return
	}
	if in.ColumnID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "column_id is required"})
		return
	}

	order := 0
	if in.Order != nil {
		order = *in.Order
		if order < 0 {
			order = 0
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var out task
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO public.api_tasks (column_id, title, description, "order", assigned_to)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, column_id, title, description, "order", assigned_to, created_at, updated_at`,
		in.ColumnID, in.Title, in.Description, order, in.AssignedTo,
	).Scan(&out.ID, &out.ColumnID, &out.Title, &out.Description, &out.Order, &out.AssignedTo, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, out)
}

func (s *server) updateTask(w http.ResponseWriter, r *http.Request, id string) {
	if s.db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database not configured"})
		return
	}

	var in struct {
		Title       *string `json:"title"`
		ColumnID    *string `json:"column_id"`
		Description *string `json:"description"`
		Order       *int    `json:"order"`
		AssignedTo  *string `json:"assigned_to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	setParts := make([]string, 0)
	args := make([]any, 0)

	if in.Title != nil {
		v := strings.TrimSpace(*in.Title)
		setParts = append(setParts, fmt.Sprintf("title = $%d", len(args)+1))
		args = append(args, v)
	}
	if in.ColumnID != nil {
		v := strings.TrimSpace(*in.ColumnID)
		if v == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "column_id cannot be empty"})
			return
		}
		setParts = append(setParts, fmt.Sprintf("column_id = $%d", len(args)+1))
		args = append(args, v)
	}
	if in.Description != nil {
		d := strings.TrimSpace(*in.Description)
		setParts = append(setParts, fmt.Sprintf("description = $%d", len(args)+1))
		args = append(args, d)
	}
	if in.Order != nil {
		ord := *in.Order
		if ord < 0 {
			ord = 0
		}
		setParts = append(setParts, fmt.Sprintf("\"order\" = $%d", len(args)+1))
		args = append(args, ord)
	}
	if in.AssignedTo != nil {
		a := strings.TrimSpace(*in.AssignedTo)
		setParts = append(setParts, fmt.Sprintf("assigned_to = $%d", len(args)+1))
		args = append(args, a)
	}

	if len(setParts) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no fields to update"})
		return
	}

	setParts = append(setParts, "updated_at = timezone('utc'::text, now())")
	args = append(args, id)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	query := fmt.Sprintf(`
		UPDATE public.api_tasks
		SET %s
		WHERE id::text = $%d
		RETURNING id::text, column_id, title, description, "order", assigned_to, created_at, updated_at`, strings.Join(setParts, ", "), len(args))

	var out task
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&out.ID, &out.ColumnID, &out.Title, &out.Description, &out.Order, &out.AssignedTo, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, out)
}

func (s *server) deleteTask(w http.ResponseWriter, r *http.Request, id string) {
	if s.db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database not configured"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := s.db.ExecContext(ctx, `DELETE FROM public.api_tasks WHERE id::text = $1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"deleted": true, "id": id})
}

func (s *server) listLogs(w http.ResponseWriter, r *http.Request) {
	if s.db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database not configured"})
		return
	}

	limit := 100
	if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid limit"})
			return
		}
		if parsed > 500 {
			parsed = 500
		}
		limit = parsed
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
		SELECT id::text, agent_id, level, message, metadata, timestamp
		FROM public.api_logs
		ORDER BY timestamp DESC
		LIMIT $1`, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := make([]logEntry, 0)
	for rows.Next() {
		var item logEntry
		var metadataJSON []byte
		if err := rows.Scan(&item.ID, &item.AgentID, &item.Level, &item.Message, &metadataJSON, &item.Timestamp); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if len(metadataJSON) > 0 {
			_ = json.Unmarshal(metadataJSON, &item.Metadata)
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
	if s.db == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database not configured"})
		return
	}

	var in struct {
		AgentID  string         `json:"agent_id"`
		Level    string         `json:"level"`
		Message  string         `json:"message"`
		Metadata map[string]any `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}
	in.AgentID = strings.TrimSpace(in.AgentID)
	in.Level = strings.TrimSpace(in.Level)
	in.Message = strings.TrimSpace(in.Message)
	if in.Message == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "message is required"})
		return
	}
	if in.AgentID == "" {
		in.AgentID = "unknown"
	}
	if in.Level == "" {
		in.Level = "info"
	}

	metadataBytes := []byte("null")
	if in.Metadata != nil {
		if encoded, err := json.Marshal(in.Metadata); err == nil {
			metadataBytes = encoded
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var out logEntry
	var metadataJSON []byte
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO public.api_logs (agent_id, level, message, metadata)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text, agent_id, level, message, metadata, timestamp`,
		in.AgentID, in.Level, in.Message, metadataBytes,
	).Scan(&out.ID, &out.AgentID, &out.Level, &out.Message, &metadataJSON, &out.Timestamp)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if len(metadataJSON) > 0 {
		_ = json.Unmarshal(metadataJSON, &out.Metadata)
	}

	writeJSON(w, http.StatusCreated, out)
}

func ensureSchema(ctx context.Context, db *sql.DB) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS pgcrypto`,
		`CREATE TABLE IF NOT EXISTS public.api_tasks (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			column_id TEXT NOT NULL DEFAULT 'col-1',
			title TEXT NOT NULL,
			description TEXT,
			"order" INTEGER NOT NULL DEFAULT 0,
			assigned_to TEXT,
			status TEXT NOT NULL DEFAULT 'todo',
			created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
			updated_at TIMESTAMPTZ
		)`,
		`ALTER TABLE public.api_tasks ADD COLUMN IF NOT EXISTS column_id TEXT`,
		`ALTER TABLE public.api_tasks ADD COLUMN IF NOT EXISTS description TEXT`,
		`ALTER TABLE public.api_tasks ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE public.api_tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT`,
		`ALTER TABLE public.api_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
		`UPDATE public.api_tasks SET column_id = COALESCE(NULLIF(column_id, ''), NULLIF(status, ''), 'col-1') WHERE column_id IS NULL OR column_id = ''`,

		`CREATE TABLE IF NOT EXISTS public.api_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			agent_id TEXT NOT NULL DEFAULT 'unknown',
			level TEXT NOT NULL DEFAULT 'info',
			message TEXT NOT NULL,
			metadata JSONB,
			timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
			created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
		)`,
		`ALTER TABLE public.api_logs ADD COLUMN IF NOT EXISTS agent_id TEXT NOT NULL DEFAULT 'unknown'`,
		`ALTER TABLE public.api_logs ADD COLUMN IF NOT EXISTS metadata JSONB`,
		`ALTER TABLE public.api_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`,
		`UPDATE public.api_logs SET timestamp = COALESCE(timestamp, created_at, timezone('utc'::text, now())) WHERE timestamp IS NULL`,
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

type providerModelKey struct {
	Provider string
	Model    string
}

type providerModelUsage struct {
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	UsedTokens int    `json:"usedTokens"`
}

func sumOpenClawTokens(agentsDir string, since time.Time) (int, int, map[providerModelKey]int, error) {
	tokens := 0
	files := 0
	breakdown := make(map[providerModelKey]int)
	// Directory structure: <agentsDir>/<agent>/sessions/<session>.jsonl
	agentEntries, err := os.ReadDir(agentsDir)
	if err != nil {
		return 0, 0, nil, err
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
			fileTokens, fileBreakdown, ok, err := sumTokensInJSONL(path, since)
			if err != nil {
				continue
			}
			if ok {
				files++
			}
			tokens += fileTokens
			for k, v := range fileBreakdown {
				breakdown[k] += v
			}
		}
	}
	return tokens, files, breakdown, nil
}

func sumTokensInJSONL(path string, since time.Time) (int, map[providerModelKey]int, bool, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, nil, false, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	// allow long lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 2*1024*1024)

	tokens := 0
	counted := false
	breakdown := make(map[providerModelKey]int)
	for scanner.Scan() {
		line := scanner.Bytes()
		var rec struct {
			Type      string `json:"type"`
			Timestamp string `json:"timestamp"`
			Message   *struct {
				Provider string `json:"provider"`
				Model    string `json:"model"`
				Usage    *struct {
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
		provider := strings.TrimSpace(rec.Message.Provider)
		if provider == "" {
			provider = "unknown"
		}
		model := strings.TrimSpace(rec.Message.Model)
		if model == "" {
			model = "unknown"
		}
		breakdown[providerModelKey{Provider: provider, Model: model}] += rec.Message.Usage.TotalTokens
		counted = true
	}
	if err := scanner.Err(); err != nil {
		return 0, nil, false, err
	}
	return tokens, breakdown, counted, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
	}
}
