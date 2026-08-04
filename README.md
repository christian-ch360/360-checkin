# CreatorHub360 Operations Platform

The operating system for the CreatorHub360 creator economy campus — members, projects, brands,
commissions, facility access, booths, and GMV attribution.

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS v4, shadcn/ui (Radix primitives), Framer Motion, Recharts, TanStack Table
- **Backend:** Supabase (Postgres + Auth), Prisma ORM
- **QR:** `qrcode` for generation, `html5-qrcode` for camera scanning (plus USB keyboard-wedge scanner input)
- **State:** Zustand (UI state), React Server Components for data
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest

## Project structure

```
src/
  app/                    Next.js routes (route groups: (auth), (dashboard))
  features/<domain>/      Feature-based modules: components, services, schemas
    services/             Server-only data access + server actions
    components/           Client/server UI components for the feature
  components/ui/          shadcn/ui primitives
  components/layout/      App shell (sidebar, topbar, command palette)
  components/shared/      Cross-feature presentational components
  lib/                    Supabase clients, Prisma client, permissions, formatting
  stores/                 Zustand stores
  config/                 Navigation config
prisma/
  schema.prisma           Full data model
  seed.ts                 Seed script (org, tiers, sample members/project/booth/room)
tests/
  unit/                   Pure-function tests (permissions, formatting, QR signing)
  integration/            Tests that hit a real Postgres database
```

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Provision a database

You need a Postgres database. Two options:

**Option A — Supabase (recommended, matches production):**

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key from Settings → API.
3. Copy the connection strings from Settings → Database (use the pooled connection for
   `DATABASE_URL` and the direct connection for `DIRECT_URL`).

**Option B — local Postgres (schema/logic development only, no Auth):**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb ch360_dev
```

Note that without a real Supabase project, `supabase.auth.*` calls will always return "not
authenticated," so you won't be able to sign in through the UI — this option is only useful for
testing the database layer directly (Prisma queries, seed data, integration tests).

### 3. Configure environment variables

```bash
cp .env.example .env.local
cp .env.example .env
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`DATABASE_URL`, and `DIRECT_URL`. Generate a random `QR_SECRET` (used to HMAC-sign QR tokens):

```bash
openssl rand -hex 32
```

### 4. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

The seed script creates an organization, the five commission tiers (A–E at 12/10/7/5/3%), a
sample company/brand/project, a booth, a room, and five members with QR codes.

### 5. Connect Supabase Auth users to Member records

Members are matched to Supabase Auth users via `Member.authUserId`. After a user signs up through
the app (or is created directly in Supabase Auth), set that column to their Supabase
`auth.users.id` so `getCurrentMember()` can resolve them — either via a database trigger on
`auth.users` insert, or manually for seed/demo accounts:

```sql
update members set "authUserId" = '<supabase-auth-user-uuid>' where email = 'jane@creatorhub360.dev';
```

A production deployment should wire this up automatically (e.g. a Supabase Auth webhook or DB
trigger that provisions a `Member` row — and consumes a pending `Invitation` if one exists — on
first sign-in).

### 6. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Testing

```bash
npm test        # unit + integration tests (integration tests need DATABASE_URL)
npm run test:watch
```

## Database access model

All data access goes through server-only Prisma service modules (never from client components —
enforced by the `server-only` package). Authorization is enforced in application code via
`src/lib/permissions/index.ts`, not Postgres Row Level Security — Prisma connects with a full-access
database role. If you also expose this database to other clients (e.g. direct PostgREST access),
add RLS policies there; the Next.js app itself does not rely on RLS.

## Deploying to production

1. Push this repo to GitHub and import it into Vercel (or your platform of choice).
2. Set all variables from `.env.example` in the platform's environment settings.
3. Run `npm run db:migrate:deploy` against the production database (via CI or manually) before
   the first deploy, then on every schema change.
4. `npm install` triggers `prisma generate` automatically via the `postinstall` script.
5. Configure Supabase Storage if you want real file/photo uploads (the schema and `File` model are
   ready; wiring up the upload UI is the next step beyond this build).
