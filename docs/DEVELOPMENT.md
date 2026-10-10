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
   npm run db:push
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
| `npm run db:push` | Push schema changes to the database (development) |
| `npm run db:migrate` | Run Prisma migrations (creates versioned migrations) |
| `npm run db:seed` | Seed the database with initial sample data |

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
