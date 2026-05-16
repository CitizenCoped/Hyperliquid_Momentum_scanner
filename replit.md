# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Hyperliquid Momentum Scanner

A real-time setup-discovery tool for Hyperliquid perpetuals, inspired by Ross Cameron's NASDAQ small-cap momentum strategy. Two main screens: Setup Board (ranked assets) and Live Trigger Feed; plus per-asset detail and Settings.

### Artifacts
- `artifacts/api-server` (port 8080, path `/api`) — Express + Drizzle. Runs the background scanner engine on a 15s default interval.
- `artifacts/scanner` (port 21235, path `/`) — React + Vite + Tailwind + wouter. Dark "trader's cockpit" UI.

### Backend
- `lib/db/src/schema/scanner.ts` — `metric_snapshots` (rolling history per asset), `alerts`, `settings` tables.
- `artifacts/api-server/src/lib/hyperliquid.ts` — public `/info` client with timeout, exponential backoff + jitter, per-call retry budget. QuickNode env vars are reserved for streaming/gRPC paths.
- `artifacts/api-server/src/lib/scoring.ts` — port of the original Python scoring (`dayChange 0-20 + RVOL 0-25 + acceleration 0-20 + squeezeStructure 0-20 + catalyst 0-15`). Tiers: WATCH≥60, ACTIVE_SETUP≥75, A_PLUS_SETUP≥85.
- `artifacts/api-server/src/lib/scanner-engine.ts` — background poller. Fetches market context for all 191 perps, persists snapshots, computes 15m/1h/4h price deltas + RVOL via SQL on history, refreshes L2 books for top 25 by volume. Alert cooldown (10min/symbol) is **DB-backed** via the `alerts` table, with an in-memory map as a fast-path optimization. Snapshot retention: 24h with periodic app-level cleanup.
- `artifacts/api-server/src/lib/pushover.ts` — Pushover sender with severity-mapped priority.
- `artifacts/api-server/src/routes/{scanner,alerts,settings}.ts` — REST routes wired in `routes/index.ts`. Settings PUT validates payload with Zod and enforces `watch <= active <= A+` invariant server-side.

### Frontend
- `artifacts/scanner/src/App.tsx` — wouter routes: `/` Board, `/feed` Live Trigger Feed, `/asset/:symbol` Asset Detail, `/settings` Settings.
- All API hooks come from `@workspace/api-client-react` (Orval-generated). Polling: Board 10s, Feed 5s, health 30s.
- `Shell` component provides persistent top nav with live API health + summary stats.

### Secrets used
- `QUICKNODE_HTTP_URL`, `QUICKNODE_WSS_URL` — reserved for future streaming/gRPC enhancements.
- `PUSHOVER_APP_TOKEN`, `PUSHOVER_USER_KEY` — push notifications.
- `SCANNER_ADMIN_TOKEN` (preferred), `ADMIN_API_TOKEN`, or `SESSION_SECRET` — bearer token accepted by write/admin API routes.
- `SESSION_SECRET`, `DATABASE_URL` — standard.
