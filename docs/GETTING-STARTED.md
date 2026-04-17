<!-- generated-by: gsd-doc-writer -->

# Getting Started

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** (comes with Node.js)
- **Supabase account** with a PostgreSQL project created

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iceflow-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and fill in your Supabase project credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   DIRECT_URL=postgresql://postgres:your-password@your-project-ref.supabase.co:5432/postgres
   ```
   <!-- VERIFY: Supabase project URL and anon key format -->
   <!-- VERIFY: DIRECT_URL connection string format for Supabase -->

4. **Generate Prisma client and push database schema**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **(Optional) Seed the database with sample data**
   ```bash
   npm run db:seed
   ```

## First Run

Start the development server:

```bash
npm run dev
```

The application will be available at **http://localhost:3000**.

## Common Setup Issues

- **"Cannot connect to database" errors**: Verify your Supabase `DIRECT_URL` is correct in the `.env` file. The Prisma schema uses `DIRECT_URL` (not `DATABASE_URL`) for the PostgreSQL connection.

- **Prisma client out of date**: After pulling changes that update the schema, re-run `npm run db:generate` to regenerate the Prisma client.

- **Supabase credentials not working**: Ensure your Supabase project is running and the anon key has the correct RLS policies for your tables.

## Next Steps

- See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for local development setup, build commands, and code style guidelines
- See [TESTING.md](docs/TESTING.md) for testing setup and running tests
- See [CONFIGURATION.md](docs/CONFIGURATION.md) for all available environment variables