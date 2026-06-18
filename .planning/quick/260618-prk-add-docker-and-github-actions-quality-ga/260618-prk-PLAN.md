# Quick Task 260618-prk: Add Docker and GitHub Actions quality gate

## Goal
Add Docker support for local development and production image builds, plus a GitHub Actions quality gate for pull requests and `main`.

## Tasks

1. Add Docker runtime files.
   - Files: `Dockerfile`, `.dockerignore`, `docker-compose.yml`
   - Action: Provide dev and production container paths, with local PostgreSQL in compose.
   - Verify: `docker compose config`

2. Add CI quality gate and package scripts.
   - Files: `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `next.config.mjs`
   - Action: Add typecheck script, modern ESLint CLI lint script, standalone Next output, and CI steps.
   - Verify: `npm run db:generate`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

3. Document local Docker usage.
   - Files: `README.md`
   - Action: Add Docker quick start and Prisma command examples for compose.
   - Verify: README contains app URL, DB URL, and compose commands.
