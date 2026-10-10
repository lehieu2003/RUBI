<!-- generated-by: gsd-doc-writer -->
# Development

## Local Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd iceflow-saas
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

4. **(Optional) Seed with sample data**
   ```bash
   npm run db:seed
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
| `npm run db:seed` | Seed the database with initial sample data |

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
