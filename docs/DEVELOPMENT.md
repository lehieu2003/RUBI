<!-- generated-by: gsd-doc-writer -->
# Development

## Local Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd RUBI
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase project credentials. See [CONFIGURATION.md](CONFIGURATION.md) for the full list of required variables.

3. **Initialize the database**
   ```bash
   npm run db:generate
   npm run db:deploy
   ```

4. **Create the manager account** (real database) or seed demo data (local database only)
   ```bash
   npm run admin:create   # real database: asks for email, name, password
   npm run db:seed        # local database only: demo data, password 12345678
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at **http://localhost:3000**.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint to check code quality |
| `npm run db:generate` | Generate Prisma client from schema |
| `npm run db:migrate` | Create a migration from schema changes and apply it (development) |
| `npm run db:deploy` | Apply pending migrations (shared/production database) |
| `npm run db:seed` | Seed a local database with demo data (refuses remote databases) |
| `npm run admin:create` | Create the single manager account interactively |

## Accounts and Passwords

- There is exactly one manager (`ADMIN`) account. It is created once with `npm run admin:create`, which asks for the email, name and password in the terminal and refuses to run if a manager already exists. No credential is stored in the code.
- The manager creates `STAFF` and `DRIVER` accounts in Settings. The app cannot create another manager, and nobody can register themselves.
- Accounts created by the manager, or whose password the manager resets, must set their own password at the next login (`/change-password`). Until then every page redirects there and every API call returns `403 PASSWORD_CHANGE_REQUIRED`.
- Anyone can change their own password at `/change-password` (the manager also under Settings > Bảo mật). The current password is required.
- Password policy (`src/lib/password.ts`): at least 8 characters, letters and digits, not a well-known password.
- `npm run db:seed` loads demo data with the default password `12345678`. It only runs against a local database (`localhost`, `127.0.0.1`, the compose `postgres` host) and never overwrites the password of an existing account. `SEED_ALLOW_REMOTE=true` overrides the check; do not use it on the real database.

## API Contracts

Every API endpoint has a contract in `src/lib/contracts` (Zod schemas for path/query parameters, request body and response, plus who may call it and the error statuses).

- `npm run contract:docs` regenerates `docs/openapi.json` and `docs/API-CONTRACT.md`. The test suite fails when they are stale.
- `npm run contract:verify` calls every endpoint of a running local server (seeded demo data) and checks the real responses against the contracts, including fields the contract does not declare. It changes data, so it refuses non-local servers. CI runs it against the built app.
- The test suite also fails when a route handler has no contract, or a contract has no route.

When you add or change an endpoint: update its contract, run `npm run contract:docs`, and commit both.

## Database Schema Changes

The schema is managed with Prisma Migrate only; `prisma db push` is not used, because it changes the database without leaving a migration file.

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` and give the migration a name. Prisma writes `prisma/migrations/<timestamp>_<name>/migration.sql` and applies it to the database in `DATABASE_URL`.
3. Review the generated SQL and commit it together with the schema change.
4. Other databases pick it up with `npm run db:deploy`.

Notes:

- `prisma migrate dev` needs to create a temporary shadow database and may offer to reset the database when it detects drift. Never accept a reset on the shared Supabase database. Prefer running it against a local Postgres (`docker compose up postgres`), then apply to Supabase with `npm run db:deploy`.
- CI applies all migrations to an empty Postgres and fails if the result differs from `schema.prisma`, so a schema change without a migration cannot be merged.
- History starts at `20261010000000_baseline`, which captures the schema as of 2026-10-10. On the existing Supabase database it was marked as applied with `prisma migrate resolve --applied`, not executed.

## Code Style

### ESLint

The project uses ESLint with TypeScript support.

**Config file:** `eslint.config.mjs`

**Plugins:**
- `typescript-eslint` - TypeScript support
- `eslint-plugin-react-hooks` - React Hooks rules
- `eslint-plugin-react-refresh` - React refresh compatibility

**Key rules:**
- `react-hooks/rules-of-hooks`: error (enforces Hooks rules)
- `react-hooks/exhaustive-deps`: warn (checks dependency arrays)
- `@typescript-eslint/no-unused-vars`: warn with `argsIgnorePattern: "^_"`
- `no-console`: warn (allows `warn` and `error`, blocks `console.log`)

**Run ESLint:**
```bash
npm run lint
```

### Prettier

No Prettier configuration is present in the project.

### EditorConfig

No `.editorconfig` file is present in the project root.

## Branch & Commit Conventions

- `dev` is the integration branch, `master` the released line. Never commit directly to either.
- One branch per task, created from `dev`: `<type>/<task-name>` in lowercase (`feat/customer-import`, `fix/login-redirect`).
- Commit messages follow Conventional Commits: `type(scope): summary`, scope optional.
- Allowed types for both branches and commits: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

These rules are enforced by `scripts/validate.sh`:

- locally through git hooks in `.githooks/` (`pre-commit` checks the branch, `commit-msg` checks the message, `pre-push` refuses pushes to `dev` and `master`). `npm install` activates them by setting `core.hooksPath`; to do it by hand run `git config core.hooksPath .githooks`.
- in CI, which re-checks the branch name and every commit of the pull request, since local hooks can be skipped with `--no-verify`.

Lint, typecheck, tests and build are not run in the hooks; CI runs them.

GitHub branch protection is not available for this private repository on the free plan, so the `pre-push` hook is the only guard against direct pushes; it can be bypassed with `--no-verify`.

## PR Process

1. Create a branch from `dev` following the convention above
2. Commit your changes
3. Push the branch and open a pull request into `dev`, describing why, what changed, how it was verified and how to roll back
4. Merge only when the CI "Quality Gate" is green

Releases go from `dev` to `master` through a pull request as well (head `dev`, base `master`); that is the only PR whose head branch is exempt from the branch-name check.
