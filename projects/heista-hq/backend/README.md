# Heista Go Backend

Minimal Go API for Cloudflare Tunnel target.

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /api/logs` → fetch from Supabase `logs` table
- `POST /api/logs` → insert JSON row(s) to Supabase `logs`
- `GET /api/tasks` → fetch from Supabase `tasks` table
- `POST /api/tasks` → insert JSON row(s) to Supabase `tasks`

## Environment Variables

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Example `.env`:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

> Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

## Run locally

```bash
cd backend
./run.sh
```

Backend listens on `127.0.0.1:8080`.

## CORS

Allows:

- `http://localhost:3000`
- `http://localhost:5173`
- `https://heista-hq.vercel.app`
- Any `https://*.vercel.app`

## Optional: systemd service

Install service (as root):

```bash
sudo cp backend/heista-go.service /etc/systemd/system/heista-go.service
sudo systemctl daemon-reload
sudo systemctl enable --now heista-go.service
sudo systemctl status heista-go.service
```
