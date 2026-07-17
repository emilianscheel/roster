# Roster Next.js app

## Stack

- Bun + Next.js + TypeScript + Tailwind + shadcn/ui (Base UI)
- Better Auth passkeys (email identity, no passwords)
- Drizzle + Postgres via Apple `container` CLI
- AI SDK agents with local Apple Container sandbox (not Vercel Sandbox)

## Quick start

```bash
cd next
bun install
bun run dev:all   # starts Postgres + pushes schema + next dev
```

Or separately:

```bash
bun run db:up
bun run db:push
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth

1. Enter email
2. **Register passkey** (first time) or **Sign in with passkey**

## Env

Copy `.env.example` → `.env`:

- `DATABASE_URL` — Postgres
- `BETTER_AUTH_SECRET` — session secret
- `AI_GATEWAY_API_KEY` — optional; without it, demo recruiting/coding loops run locally
- `DEMO_MODE=true` — Zero research is mocked; outreach is always HITL-gated

## Demo safety

Research tools may run autonomously. Contact unlock / outreach / calls create **Approvals** cards (Allow / Reject / Reform) and never hit live Zero outreach.
