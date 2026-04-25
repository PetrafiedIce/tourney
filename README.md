# FlowPvP Brackets

A Next.js App Router web app for running single-elimination Minecraft PvP tournaments on FlowPvP. Players click when they finished a match, and the server scrapes FlowPvP profile pages to detect the real winner and advance the bracket.

## Stack

- Next.js 16 App Router + TypeScript
- Prisma ORM + PostgreSQL (Neon friendly)
- Tailwind CSS + lightweight shadcn-style UI primitives
- Vercel-compatible request-driven architecture

## Environment variables

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`: Neon/Postgres connection string
- `ADMIN_DEFAULT_TOKEN`: optional fallback admin token for newly created tournaments and local seeds

## Install

```bash
npm install
npm run prisma:generate
```

## Prisma setup

Create and apply a migration locally:

```bash
npx prisma migrate dev --name init
```

Deploy migrations in production:

```bash
npm run prisma:migrate
```

## Seed demo data

```bash
npm run db:seed
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deployment on Vercel + Neon

1. Create a Neon Postgres database.
2. Set `DATABASE_URL` and optionally `ADMIN_DEFAULT_TOKEN` in Vercel project environment variables.
3. Deploy the repo to Vercel.
4. Configure the build command as `npm run build`.
5. Run `npm run prisma:migrate` against the production database before or during your release workflow.

## Notes about FlowPvP scraping

- All FlowPvP requests stay server-side.
- Requests use a real browser user-agent.
- If direct fetch gets blocked by Cloudflare, the app retries through `cloudscraper`.
- Profile fetches are cached in memory for 30 seconds and rate-limited to one fetch per username per 10 seconds.
- If parsing fails because FlowPvP changes their HTML, the API returns `parser_failed` so admins can manually override the result.
