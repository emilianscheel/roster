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
- `DEMO_MODE=true` — Zero research is mocked globally; set `false` after connecting Zero in **Get started**
- `ZERO_TOKEN_ENCRYPTION_KEY` — encrypts Zero session tokens at rest (defaults to `BETTER_AUTH_SECRET`)

## Zero (live payments)

1. Sign in with a passkey
2. Open **Get started** in the sidebar
3. Connect a [zero.xyz](https://www.zero.xyz) account (device login creates one on first auth)
4. Fund the wallet if needed
5. Set `DEMO_MODE=false` and enable **Go live**

Until then, research stays mocked. Contact unlock / outreach / calls always create **Approvals** cards.

## Demo safety

Research tools may run autonomously in demo mode. Contact unlock / outreach / calls create **Approvals** cards (Allow / Reject / Reform) and never hit live Zero outreach without approval.
