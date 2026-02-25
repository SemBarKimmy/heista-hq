# HEISTA HQ - Project Blueprint & Status

> **SOURCE OF TRUTH UNTUK ARGA & TIM.** 
> Baca file ini sebelum mulai kerja. Jangan pernah skip atau ngide diluar ini tanpa approval Danu.

---

## 🏗️ Core Architecture (Monorepo)
- **Frontend:** Next.js (App Router), Tailwind v4 (OKLCH), shadcn/ui.
- **Backend:** Go (API, MFA/TOTP logic).
- **Database:** Supabase (Auth, Realtime, Storage).
- **Deployment:** Vercel (2 Envs: Dev & Prod).

---

## 🎨 Design System (Discord x Compfest)
- **Theme:** Solid Pink & Purple (OKLCH).
- **Constraints:** No gradients, no neon/glow, professional, humanized.
- **Modes:** Dark & Light mode wajib (via `next-themes`).
- **Layout:** Sidebar Navigation (Sticky), Header with Mode Toggle.

---

## 🗺️ Page Structure & Sitemap
1. **Dashboard (`/`)**: Bento summary cards + quick summary (tanpa full Trello board).
2. **Tasks (`/tasks`)**: Main Trello Board (Task Management).
3. **Agent Monitoring (`/monitor`)**: Status card per agent (Off/Idle/Busy), model, current task, reason.
4. **Agent Logs (`/logs`)**: Raw terminal-style logs (initial fetch + realtime INSERT).
5. **Settings (`/settings`)**: Account, Workspace, & MFA Config.
6. **Auth (`/login`, `/mfa`)**: Secure entry.

---

## 🧾 Iteration Log (Wajib Diupdate)
> Source of truth untuk "kita lagi iterasi keberapa" + link PR.

| Iterasi | Fokus | Branch / PR | Status |
|---|---|---|---|
| 1-4 | Foundation (monorepo, schema, initial UI) | (historical; awalnya autopilot) | done |
| 5 | QA Fixes & UI Refactor | PR: https://github.com/SemBarKimmy/heista-hq/pull/1 | merged |
| 6 | Core Fixes (Add Card, Logs, Sidebar, Dark/Light) | PR: https://github.com/SemBarKimmy/heista-hq/pull/2 | merged |
| 7 (v2) | UI/UX refactor total (Top Nav, Bento Dashboard, Mobile-first, no gradients) + auto-update feed 2 jam | Branch: `feat/v2-foundation` | done |
| 8 (v2) | Monitoring & Feeds split: `/monitor` + raw `/logs` + data adapters dashboard + unit tests | PR: https://github.com/SemBarKimmy/heista-hq/pull/3 | merged |
| 9 (v2) | `/tasks` page as full board + floating centered top nav + mobile drawer polish + route tests | Branch: `feat/v2-tasks-nav` | running |

---

## 🛠️ Feature Requirements (Current Status)

### 1. Trello Board
- [x] Drag & Drop (Cross-column)
- [x] Persist order to Supabase
- [x] UI consistent with Pink/Purple theme
- [x] **Add Card Functionality** (Modal/Input)

### 2. Agent Monitoring
- [x] Page `/monitor` untuk cards per-agent
- [x] Field wajib: status (Off/Idle/Busy), model, current task, reason

### 3. Agent Logs (`/logs`)
- [x] Raw terminal-style logs tampil
- [x] Initial fetch (100 logs)
- [x] Realtime INSERT subscription

### 4. Dashboard data integrations (`/`)
- [x] Token usage adapter (OpenClaw endpoint + fallback route contract `/api/openclaw/token-usage`)
- [x] VPS status adapter (endpoint/DB + fallback; CPU/RAM/Disk + `updatedAt`)
- [x] News/Twitter trends adapter (DB endpoint + fallback; include `updatedAt` + next refresh indicator)
- [x] Auto-refresh policy 2 jam (`revalidate = 7200`) + stale check via server timestamp

### 5. Testing (XP)
- [x] Unit test `/monitor` rendering
- [x] Unit test dashboard data adapters

---

## ✅ QA / Integration Testing / UAT (Martha)
> **Martha kerja setelah PR sudah di-merge ke `develop`** (bukan saat masih di branch fitur).
> Fokus: Integration Testing + UAT end-to-end (bukan cuma unit test).

### UAT Checklist (wajib PASS)
**Task Board**
- [ ] Add card (judul minimal) → muncul di UI → tersimpan di Supabase.
- [ ] Move card antar kolom (To Do → In Progress → Done) = "progress card" harus bisa.
- [ ] Reload page → state tetap sesuai DB.

**Agent Monitoring (`/monitor`)**
- [ ] Tiap agent tampil: status (Off/Idle/Busy), model, current task, dan reason (kenapa Busy/Idle).

**Agent Logs (`/logs`)**
- [ ] Raw terminal logs tampil.
- [ ] Aksi di Task Board menghasilkan log baru (realtime) dan log lama bisa di-load (initial fetch).

**Dashboard (`/`)**
- [ ] Mobile-first layout rapi.
- [ ] Bento cards tampil: AI token usage, VPS status, News, Twitter trends.

**General**
- [ ] Dark mode / Light mode toggle berfungsi.
- [ ] Tidak ada gradient, theme OKLCH konsisten.

---

## 📋 XP Workflow Rules
1. **Branching:** `feat/*` -> PR to `develop` -> Merge to `master`.
2. **Tests (di dalam iterasi):** Unit test wajib dibuat di setiap iterasi (XP).
3. **QA (di luar iterasi):** Martha menjalankan Integration Testing + UAT **setelah merge ke `develop`**.
4. **Docs / Gate:** **PR tidak boleh di-merge ke `develop` kalau BLUEPRINT.md belum diupdate** (Iteration Log + scope + UAT checklist).

## 🚀 CI/CD Policy (Merge-Only Deploy)
- CI dipisah dari deploy:
  - `.github/workflows/ci.yml` untuk test/build (PR + non-deploy branch pushes).
  - `.github/workflows/deploy.yml` untuk deploy **hanya** pada push ke `develop`/`master` (tidak jalan pada PR create/update, tidak jalan pada push feature branch).
- Deploy workflow (`deploy.yml`) flow: checkout -> setup node -> `npm ci` (di `frontend`) -> `vercel pull` -> `vercel build` -> `vercel deploy --prebuilt` -> set alias environment.
- Vercel CLI wajib pakai scope: `--scope barangs-projects-fc314b46`.
- Root directory deploy: `frontend`.
- Alias behavior:
  - Push ke `develop` => preview deploy + alias `heista-dev.vercel.app`
  - Push ke `master` => prod deploy + alias `heista-hq.vercel.app`
- Required GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Vercel Git auto deployment harus **OFF** (deploy source of truth = GitHub Actions).
- Release version bump via `.github/workflows/version-bump.yml` + `VERSION` file.

*Last Updated: 2026-02-25 20:33 WIB*
