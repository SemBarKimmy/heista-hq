# Version Bump Automation

Source of truth version ada di file `VERSION`.

## Flow
1. Jalankan workflow **Version Bump** (`workflow_dispatch`) dan pilih `major|minor|patch`.
2. Workflow akan:
   - update `VERSION`
   - sync `frontend/package.json` version
   - buat PR otomatis ke `develop` dengan conventional commit:
     - `chore(release): bump version to x.y.z`
3. Setelah PR merge ke `develop`, deploy tetap mengikuti `deploy.yml` (GitHub Actions only).

## Notes
- Pastikan Vercel Git auto-deploy nonaktif.
- Secrets wajib: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
