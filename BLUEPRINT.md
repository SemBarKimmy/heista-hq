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
1.  **Dashboard (`/`)**: Main Trello Board (Task Management).
2.  **Agent Logs (`/logs`)**: Real-time Agent Activity Monitoring.
3.  **Settings (`/settings`)**: Account, Workspace, & MFA Config.
4.  **Auth (`/login`, `/mfa`)**: Secure entry.

---

## 🧾 Iteration Log (Wajib Diupdate)
> Source of truth untuk "kita lagi iterasi keberapa" + link PR.

| Iterasi | Fokus | Branch / PR | Status |
|---|---|---|---|
| 1-4 | Foundation (monorepo, schema, initial UI) | (historical; awalnya autopilot) | done |
| 5 | QA Fixes & UI Refactor | PR: https://github.com/SemBarKimmy/heista-hq/pull/1 | merged |
| 6 | Core Fixes (Add Card, Logs, Sidebar, Dark/Light) | PR: https://github.com/SemBarKimmy/heista-hq/pull/2 | merged |
| 7 (v2) | UI/UX refactor total (Top Nav, Bento Dashboard, Mobile-first, no gradients) + auto-update feed 2 jam | Branch: `feat/v2-foundation` | in progress (Arga - Iterasi 7) |

---

## 🛠️ Feature Requirements (Current Status)

### 1. Trello Board
- [x] Drag & Drop (Cross-column)
- [x] Persist order to Supabase
- [x] UI consistent with Pink/Purple theme
- [x] **Add Card Functionality** (Modal/Input) -> *Recently Added*

### 2. Agent Monitoring
- [x] Initial fetch (100 logs)
- [x] Real-time INSERT subscription
- [x] **Auto-logging** on Trello actions -> *Recently Added*

### 3. Global UI/UX
- [x] Sidebar Navigation
- [x] Dark/Light Mode Toggle
- [x] ThemeProvider integration

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

*Last Updated: 2026-02-25 12:24 WIB*
