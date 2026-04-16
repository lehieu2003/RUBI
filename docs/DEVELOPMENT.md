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

## Branch Conventions

No branch naming convention is currently documented in the repository.

The default branch is `master`.

## PR Process

No pull request template or contribution guidelines are currently documented in the repository.

General guidance for submitting changes:

1. Create a feature branch from `master`
2. Make your changes following the code style guidelines
3. Run `npm run lint` and fix any warnings or errors
4. Test your changes locally with `npm run dev`
5. Push your branch and submit a pull request for review
