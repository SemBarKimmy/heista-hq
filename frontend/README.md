This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel (GitHub Actions)

Deployment is handled by `.github/workflows/deploy.yml` from the monorepo root.

- Trigger: push to `develop` or `master` only
- Root directory: `frontend`
- Scope: `barangs-projects-fc314b46`
- Alias target:
  - `develop` -> `heista-dev.vercel.app`
  - `master` -> `heista-hq.vercel.app`

### Required GitHub Secrets

Set these in repository **Settings -> Secrets and variables -> Actions**:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Environment Variables

Set `NEXT_PUBLIC_API_URL` in Vercel / your runtime environment:

- **Develop (dev):** `https://heistadev.danuseta.my.id`
- **Master (prod):** `https://heista.danuseta.my.id`

If `NEXT_PUBLIC_API_URL` is not set, the frontend falls back to the dev URL.
