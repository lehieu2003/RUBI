<!-- generated-by: gsd-doc-writer -->
# Configuration

This document describes all environment variables and configuration settings for IceFlow.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | - | Supabase project reference URL (found in Supabase dashboard under Project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous/public key for client-side authentication |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string with connection pooling (for application queries via Supabase pooler) |
| `DIRECT_URL` | Yes | - | PostgreSQL direct connection string (for Prisma migrations and schema operations) |
| `JWT_SECRET` | No | `iceflow-secret-key-change-in-production` | Secret key for signing JWT auth tokens. **Must be set to a secure random value in production.** |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, or `test`). Set automatically by Next.js. |

### Supabase Variables (`NEXT_PUBLIC_*`)

These are public-facing variables used by the Supabase client-side SDK. They are safe to expose in client-side code because Supabase uses them with Row Level Security (RLS) policies on the database.

- `NEXT_PUBLIC_SUPABASE_URL` - The base URL for your Supabase project (format: `https://{ref}.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - The anonymous key from Supabase (safe for client-side use)

<!-- VERIFY: Supabase project reference URL and anonymous key format/location -->

### Database Variables

These are server-side only and must be kept secure.

- `DATABASE_URL` - Connection string for the Supabase PostgreSQL pooler (port 6543). Used by Prisma for application queries.
- `DIRECT_URL` - Direct PostgreSQL connection string (port 5432). Used exclusively by Prisma for migrations and schema operations.

<!-- VERIFY: Database connection string format and pooler configuration details -->

### Authentication Variables

- `JWT_SECRET` - Used to sign and verify JWT tokens for session management. The application provides a default fallback, but production deployments must set a cryptographically secure secret.

## Config File Format

IceFlow does not use additional configuration files beyond environment variables. The project uses Next.js defaults and Prisma ORM for database access.

**Key config files:**

- `next.config.mjs` - Next.js configuration (currently minimal, uses defaults)
- `prisma/schema.prisma` - Database schema and connection configuration

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DIRECT_URL")
}
```

## Required vs Optional Settings

### Required (application fails to start without these)

| Variable | Validation |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Must be a valid URL format (`https://{ref}.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Must be a non-empty Supabase anon key |
| `DATABASE_URL` | Must be a valid PostgreSQL connection string |
| `DIRECT_URL` | Must be a valid PostgreSQL connection string |

### Optional (application starts with defaults)

| Variable | Default Value | Behavior when absent |
|----------|---------------|----------------------|
| `JWT_SECRET` | `iceflow-secret-key-change-in-production` | Uses insecure fallback secret |
| `NODE_ENV` | `development` | Automatically set by Next.js |

## Defaults

The following defaults are defined in the source code:

**`src/lib/auth.ts`** - JWT signing:
```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'iceflow-secret-key-change-in-production'
);
```

**`src/lib/db.ts`** - Prisma logging:
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
```

**`src/lib/supabase.ts`** - Supabase client creation:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

## Per-Environment Overrides

IceFlow does not currently use per-environment env files (`.env.development`, `.env.production`). Environment-specific configuration is determined by the `NODE_ENV` variable, which Next.js sets automatically:

- **Development** (`npm run dev`): `NODE_ENV=development`
  - Prisma logs all queries and errors
  - Auth cookies are not marked `secure`

- **Production** (`npm run build && npm run start`): `NODE_ENV=production`
  - Prisma logs only errors
  - Auth cookies are marked `secure`
  - JWT secret must be properly set

### Local Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values for your Supabase project:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Set database connection strings (obtained from Supabase dashboard > Settings > Database):
   ```
   DATABASE_URL="postgresql://postgres.xxx:port5432/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxx:port5432/postgres"
   ```

4. Generate a secure JWT secret:
   ```bash
   # Generate a random secret (using Node.js)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. Run database migrations:
   ```bash
   npm run db:push
   # or for new schemas
   npm run db:migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```
