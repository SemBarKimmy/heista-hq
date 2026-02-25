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

## 📋 XP Workflow Rules
1. **Branching:** `feat/*` -> PR to `develop` -> Merge to `master`.
2. **Review:** PR wajib di-audit Martha sebelum merge.
3. **Docs:** Update file ini setiap kali ada perubahan struktur atau penambahan page.

*Last Updated: 2026-02-25 10:35 WIB*
