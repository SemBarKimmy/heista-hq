# 🚀 Heista HQ - UAT Checklist (FINAL)

**Deploy URL:** https://heista-dev.vercel.app  
**Test Date:** 2026-03-01  
**Tester:** [Martha / QA Team]  
**Status:** Ready for UAT 🎯

---

## ✅ BEFORE YOU START

- [ ] Backend is running and healthy (check API responses)
- [ ] Database (Supabase) is connected
- [ ] All env vars are properly configured
- [ ] Clear browser cache & hard refresh (Ctrl+F5 / Cmd+Shift+R)

---

## 📋 UAT CHECKLIST (Must PASS ALL)

### 1. TASK BOARD (/tasks) - Kanban Board

**Objective:** Verify task management workflow (CRUD + drag & drop + persistence)

#### Test 1.1: Add Card (Create)
- [ ] Navigate to `/tasks`
- [ ] Click "+ Add a card" button in "To Do" column
- [ ] Enter task title: `TEST-UAT-001 [Your Name]`
- [ ] Click "Add" or press Enter
- [ ] **Verify:** Card appears in "To Do" column with title visible ✅
- [ ] **Verify:** Card is persisted to database (reload page → card still there) ✅

#### Test 1.2: Move Card (Drag & Drop)
- [ ] In `/tasks`, drag the card created above from "To Do" → "In Progress"
- [ ] **Verify:** Card moves smoothly during drag ✅
- [ ] **Verify:** Card stays in "In Progress" after releasing ✅
- [ ] Reload the page
- [ ] **Verify:** Card is STILL in "In Progress" after reload ✅
- [ ] Repeat: drag from "In Progress" → "Done"
- [ ] Reload page
- [ ] **Verify:** Card persists in "Done" column ✅

#### Test 1.3: Multiple Cards
- [ ] Add 3+ cards to test board state
- [ ] Mix them across columns (some in To Do, some In Progress, some Done)
- [ ] Reload page
- [ ] **Verify:** All cards are in their correct columns ✅
- [ ] Arrange columns in any order (multiple drags)
- [ ] Reload page
- [ ] **Verify:** Card order within columns is preserved ✅

#### Test 1.4: Activity Logging
- [ ] Add a card → navigate to `/logs`
- [ ] **Verify:** Log contains `Added new task: "TEST-UAT-001..."` ✅
- [ ] Drag card to different column → check `/logs`
- [ ] **Verify:** Log shows `Moved task "..." to [Column Name]` ✅

---

### 2. AGENT MONITORING (/monitor)

**Objective:** Verify agent status display

- [ ] Navigate to `/monitor`
- [ ] **Verify:** Page loads without errors ✅
- [ ] **Verify:** Agent cards display (if any agents active) ✅
- [ ] **Verify:** Each card shows: status (Off/Idle/Busy), model, current task, reason ✅

---

### 3. AGENT LOGS (/logs)

**Objective:** Verify log streaming and persistence

- [ ] Navigate to `/logs`
- [ ] **Verify:** Page displays terminal-style logs ✅
- [ ] **Verify:** If logs exist, they show in format: `[timestamp] agent_id level message` ✅
- [ ] Add a task from `/tasks` → immediately check `/logs`
- [ ] **Verify:** New log entry appears within 2 seconds ✅ (realtime subscription)
- [ ] **Verify:** Logs are ordered by newest first ✅
- [ ] Scroll to bottom → wait 5 seconds
- [ ] **Verify:** New logs auto-append to stream ✅

---

### 4. DASHBOARD (/)

**Objective:** Verify dashboard cards, layouts, and data

#### Test 4.1: Layout & Responsiveness
- [ ] Navigate to `/` (Dashboard)
- [ ] **Verify:** Page uses bento grid layout ✅
- [ ] **Verify:** Cards are readable on mobile (open DevTools → device emulation) ✅
- [ ] **Verify:** All cards fit within viewport without horizontal scroll ✅

#### Test 4.2: Bento Cards (All Required)
- [ ] **Verify:** Token Usage card displays ✅
  - Shows: `usedTokens`, `limitTokens`, `period` (e.g., "24h")
  - Includes provider/model breakdown
  - Has `updatedAt` timestamp

- [ ] **Verify:** VPS Status card displays ✅
  - Shows: CPU %, RAM %, Disk %
  - Shows status indicator (online/degraded/unknown)
  - Has `updatedAt` timestamp

- [ ] **Verify:** News feed card displays ✅
  - Shows up to 5 latest news headlines
  - Each item has: title, source, URL (clickable)
  - Has `updatedAt` timestamp with "stale after 2h" indicator

- [ ] **Verify:** Twitter Trends card displays ✅
  - Shows top 6 trends
  - Each shows: title, score (numeric)
  - Has `updatedAt` timestamp with "stale after 2h" indicator

#### Test 4.3: Stale Indicators
- [ ] Check dashboard
- [ ] **Verify:** Cards show `updatedAt` timestamp ✅
- [ ] If timestamp is >2 hours old:
  - [ ] **Verify:** Card has stale/faded appearance ✅
  - [ ] **Verify:** Manual refresh button is visible ✅

#### Test 4.4: Manual Refresh
- [ ] Click "Refresh" or refresh icon button
- [ ] **Verify:** All cards re-fetch data ✅
- [ ] **Verify:** `updatedAt` timestamps update ✅
- [ ] **Verify:** No stale indicators appear ✅

#### Test 4.5: Dark/Light Mode Toggle
- [ ] Click theme toggle button (Sun/Moon icon) in top nav
- [ ] **Verify:** Page switches to dark/light theme ✅
- [ ] **Verify:** All text remains readable ✅
- [ ] **Verify:** OKLCH color theme is consistent (no jarring color changes) ✅
- [ ] **Verify:** No gradients are visible (BLUEPRINT requirement) ✅
- [ ] Toggle back and forth 3 times
- [ ] **Verify:** Toggle works smoothly every time ✅
- [ ] Reload page
- [ ] **Verify:** Theme preference is persisted (same theme as before reload) ✅

---

### 5. GENERAL REQUIREMENTS

#### Test 5.1: Navigation & Sidebar
- [ ] Navigate through all pages:
  - [ ] `/` (Dashboard)
  - [ ] `/tasks` (Task Board)
  - [ ] `/monitor` (Agent Monitoring)
  - [ ] `/logs` (Agent Logs)
  - [ ] `/settings` (Settings)
- [ ] **Verify:** Sidebar or top nav highlights current page ✅
- [ ] **Verify:** All pages load without errors ✅

#### Test 5.2: Design System & Styling
- [ ] Check all pages
- [ ] **Verify:** No gradients anywhere (BLUEPRINT requirement) ✅
- [ ] **Verify:** Primary color is consistent pink/purple OKLCH ✅
- [ ] **Verify:** Text is readable in both dark & light modes ✅
- [ ] **Verify:** Spacing is consistent (no random padding/margins) ✅

#### Test 5.3: Performance
- [ ] Open Chrome DevTools → Network tab
- [ ] Navigate to `/tasks` and perform a drag operation
- [ ] **Verify:** API call completes within 2 seconds ✅
- [ ] **Verify:** No 404 or 5xx errors ✅

#### Test 5.4: Error Handling
- [ ] Turn off internet / block API calls in DevTools
- [ ] Try to add a task
- [ ] **Verify:** Error is handled gracefully (no white screen) ✅
- [ ] **Verify:** Error message appears in toast or inline ✅
- [ ] Turn internet back on
- [ ] **Verify:** Retry works ✅

---

## 🎯 PASS/FAIL SUMMARY

| Section | Total Tests | Passed | Failed | Status |
|---------|-------------|--------|--------|--------|
| Task Board (1) | 4 | ? | ? | ? |
| Agent Monitor (2) | 1 | ? | ? | ? |
| Agent Logs (3) | 4 | ? | ? | ? |
| Dashboard (4) | 5 | ? | ? | ? |
| General (5) | 4 | ? | ? | ? |
| **TOTAL** | **18** | ? | ? | **?** |

---

## 📝 TESTER NOTES

### Issues Found
(List any bugs, unexpected behavior, or improvements here)

---

### Recommendations
(Any follow-up work or optimizations)

---

## ✍️ SIGN-OFF

**Tester Name:** ___________________  
**Date:** ___________________  
**Overall Status:** ☐ PASS ☐ FAIL ☐ BLOCKED  
**Ready for Production:** ☐ YES ☐ NO

---

## 🚀 NEXT STEPS

If PASS ✅:
1. Merge develop → master PR
2. Trigger production deploy
3. Update VERSION file
4. Close related GitHub issues

If FAIL ❌:
1. Document issues in GitHub issues
2. Create bugfix PR
3. Re-run UAT after fixes
4. Repeat until PASS

---

**Generated:** 2026-03-01 16:04 WIB  
**Deploy Target:** https://heista-dev.vercel.app
