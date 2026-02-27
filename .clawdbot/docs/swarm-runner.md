# Swarm Runner (tmux)

This repo includes a tmux-based swarm runner for long-lived local tasks.

## Prerequisites

- `bash` (v4+)
- `tmux` (required)
- `jq` (optional, used for nicer JSON metadata writes)

### Install tmux

- Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y tmux`
- Fedora: `sudo dnf install -y tmux`
- Arch: `sudo pacman -S tmux`
- macOS (Homebrew): `brew install tmux`

Verify: `tmux -V`

## Goals

- Keep each run isolated with its own tmux session.
- Store run metadata + logs in a persistent registry.
- Use reusable templates for common commands.
- Never delete run data by default.

## Registry Layout

```text
.clawdbot/
  runs/
    .gitignore
    <run-name>/
      metadata.json
      metadata.env
      tmux.log
  templates/
    *.env
  docs/
    swarm-runner.md
```

## Quick Start

```bash
# 1) Initialize (safe to run repeatedly)
scripts/swarm-tmux init

# 2) List templates
scripts/swarm-tmux templates

# 3) Start a run from template
scripts/swarm-tmux start --template default

# 4) List runs and live status
scripts/swarm-tmux list

# 5) Show metadata/status
scripts/swarm-tmux status <run-name>

# 6) Attach to a live run
scripts/swarm-tmux attach <run-name>

# 7) Stop a run (data/logs are preserved)
scripts/swarm-tmux stop <run-name>
```

## Start Modes

### A) Template-driven

```bash
scripts/swarm-tmux start --template frontend-dev
```

### B) Custom command

```bash
scripts/swarm-tmux start \
  --name backend-tests \
  --cwd backend \
  --command "go test ./..." \
  --notes "quick backend validation"
```

## Template Format

Template files live in `.clawdbot/templates/*.env` and use strict `KEY=VALUE` format with supported keys only.

```bash
SWARM_COMMAND="npm run dev"
SWARM_CWD="frontend"
SWARM_NOTES="Run frontend dev server"
```

## Defaults & Safety

- Run name defaults to `swarm-YYYYMMDD-HHMM`.
- `--name` must match: `^[a-zA-Z0-9._-]+$`.
- `SWARM_CWD` defaults to repo root (`.`).
- `stop` only kills tmux session; registry data remains.
- Existing run directory names are never overwritten.
- Templates/metadata are parsed safely (no `source` execution).

## Troubleshooting

- `Missing required command: tmux` -> install tmux first (see above).
- `Run already exists` -> choose another `--name`.
- `Invalid --name` -> use only letters/numbers/`.`/`_`/`-`.
- `Template not found` -> check `.clawdbot/templates/` and run `scripts/swarm-tmux templates`.
