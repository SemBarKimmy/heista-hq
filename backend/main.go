package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
	}
}
