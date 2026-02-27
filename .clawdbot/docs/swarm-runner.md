# Swarm Runner (tmux)

This repo includes a tmux-based swarm runner for long-lived local tasks.

## Goals

- Keep each run isolated with its own tmux session.
- Store run metadata + logs in a persistent registry.
- Use reusable templates for common commands.
- Never delete run data by default.

## Registry Layout

```text
.clawdbot/
  runs/
    <run-name>/
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

# 5) Attach to a live run
scripts/swarm-tmux attach <run-name>

# 6) Stop a run (data/logs are preserved)
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

Template files live in `.clawdbot/templates/*.env` and use shell env format.

```bash
SWARM_COMMAND="npm run dev"
SWARM_CWD="frontend"
SWARM_NOTES="Run frontend dev server"
```

## Defaults & Safety

- Run name defaults to `swarm-YYYYMMDD-HHMM`.
- `SWARM_CWD` defaults to repo root (`.`).
- `stop` only kills tmux session; registry data remains.
- Existing run directory names are never overwritten.

## Troubleshooting

- `Missing required command: tmux` -> install tmux first.
- `Run already exists` -> choose another `--name`.
- `Template not found` -> check `.clawdbot/templates/` and run `scripts/swarm-tmux templates`.
