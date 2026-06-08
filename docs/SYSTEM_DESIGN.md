# WireGuard Manager — System Design

A strictly-frontend SPA. No backend code ships with the app. Read-only views over JSON snapshots written by an external cron job. Deployed as static files on Vercel.

## 1. Routes Table

| Path | Component | Data Dependency | Loading Fallback | Error State |
|---|---|---|---|---|
| `/` | `Dashboard` | `servers.json` + aggregated peer rollups | `DashboardSkeleton` (card + matrix placeholders) | `ErrorPanel` w/ retry; partial render if some servers fail |
| `/servers` | `ServerList` | `servers.json` | `CardGridSkeleton` (n=6 shimmer cards) | `ErrorPanel`, full-width |
| `/servers/:id` | `ServerDetail` | `servers.json` (lookup) + `servers/{id}/peers.json` | `TableSkeleton` + `StatsRailSkeleton` | `NotFound` if id missing; `ErrorPanel` on fetch fail |
| `/servers/:sid/peers/:pid` | `PeerDetail` | `.../peers.json` (lookup) + `peers/{pid}/config.json` + `peers/{pid}/history.json` (optional) | `PeerDetailSkeleton` | `NotFound` if pid missing; chart degrades gracefully if history absent |
| `/topology` | `Topology` | `servers.json` + all `peers.json` (fan-out) | `GraphSkeleton` (centered spinner + dim canvas) | `ErrorPanel`; renders partial graph if subset loads |
| `/export` | `Export` | `servers.json` + all `peers.json` + lazy per-peer `config.json` on click | `ListSkeleton` | per-row error badge, page stays usable |
| `/settings` | `Settings` | none (Zustand only) | none | inline field validation |
| `*` | `NotFound` | none | none | n/a |

## 2. TypeScript Data Model

Framework-agnostic. `@/types/index.ts`:

```ts
export type ServerStatus = 'active' | 'inactive';
export type PeerHealth = 'online' | 'offline' | 'degraded';

export interface Server {
  id: string;
  name: string;
  interface: string;        // "wg0"
  publicKey: string;
  address: string;          // "10.0.0.1/24"
  listenPort: number;
  status: ServerStatus;
  peerCount: number;
  onlinePeerCount: number;
  totalRxBytes: number;     // precomputed at write-time
  totalTxBytes: number;
  lastUpdated: string;      // ISO 8601, snapshot time
}

export interface Peer {
  id: string;
  serverId: string;
  name: string;
  publicKey: string;
  allowedIps: string[];     // ["10.0.0.2/32"]
  endpoint: string | null;  // "203.0.113.5:51820"
  latestHandshake: string | null; // ISO 8601
  handshakeAgeSeconds: number | null; // precomputed at write-time
  rxBytes: number;
  txBytes: number;
  persistentKeepalive: number | null; // seconds
  enabled: boolean;
  usesPresharedKey: boolean;
  health: PeerHealth;       // precomputed at write-time
}

export interface PeerConfig {
  peerId: string;
  conf: string;             // full wg-quick .conf content
  fileName: string;         // "peer-laptop.conf"
}

export interface HistorySnapshot {
  t: string;                // ISO 8601
  rxBytes: number;
  txBytes: number;
  handshakeAgeSeconds: number | null;
}

export interface PeerHistory {
  peerId: string;
  snapshots: HistorySnapshot[];
}

export interface ServersFile { servers: Server[]; generatedAt: string; }
export interface PeersFile   { serverId: string; peers: Peer[]; generatedAt: string; }
```

Computed/derived view-models (e.g. dashboard aggregates) live in `@/lib/derive.ts`, never in the type module.

## 3. Zod Schemas

`@/lib/schemas.ts` — single source of truth at the fetch boundary; TS types are *inferred* from these where practical, or kept parallel and asserted in tests.

```ts
import { z } from 'zod';

export const ServerStatusSchema = z.enum(['active', 'inactive']);
export const PeerHealthSchema = z.enum(['online', 'offline', 'degraded']);

export const ServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  interface: z.string().regex(/^wg\d+$/),
  publicKey: z.string().length(44),         // base64 32-byte key
  address: z.string(),
  listenPort: z.number().int().min(1).max(65535),
  status: ServerStatusSchema,
  peerCount: z.number().int().nonnegative(),
  onlinePeerCount: z.number().int().nonnegative(),
  totalRxBytes: z.number().nonnegative(),
  totalTxBytes: z.number().nonnegative(),
  lastUpdated: z.string().datetime(),
});

export const PeerSchema = z.object({
  id: z.string().min(1),
  serverId: z.string().min(1),
  name: z.string().min(1),
  publicKey: z.string().length(44),
  allowedIps: z.array(z.string()),
  endpoint: z.string().nullable(),
  latestHandshake: z.string().datetime().nullable(),
  handshakeAgeSeconds: z.number().nonnegative().nullable(),
  rxBytes: z.number().nonnegative(),
  txBytes: z.number().nonnegative(),
  persistentKeepalive: z.number().int().nonnegative().nullable(),
  enabled: z.boolean(),
  usesPresharedKey: z.boolean(),
  health: PeerHealthSchema,
});

export const PeerConfigSchema = z.object({
  peerId: z.string(),
  conf: z.string().min(1),
  fileName: z.string().endsWith('.conf'),
});

export const HistorySnapshotSchema = z.object({
  t: z.string().datetime(),
  rxBytes: z.number().nonnegative(),
  txBytes: z.number().nonnegative(),
  handshakeAgeSeconds: z.number().nonnegative().nullable(),
});

export const ServersFileSchema = z.object({
  servers: z.array(ServerSchema),
  generatedAt: z.string().datetime(),
});
export const PeersFileSchema = z.object({
  serverId: z.string(),
  peers: z.array(PeerSchema),
  generatedAt: z.string().datetime(),
});
export const PeerHistorySchema = z.object({
  peerId: z.string(),
  snapshots: z.array(HistorySnapshotSchema),
});
```

Fetch wrapper validates and throws a typed `SchemaError` on failure so the Error Boundary can distinguish "bad data" from "network error".

```ts
async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new FetchError(res.status, url);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new SchemaError(url, parsed.error);
  return parsed.data;
}
```

## 4. Data Fetching Strategy (TanStack Query)

Base URL comes from the Zustand `dataSourceUrl` (default `/data`). Query keys are stable and hierarchical.

| Hook | Key | Endpoint | staleTime | refetchInterval |
|---|---|---|---|---|
| `useServers()` | `['servers']` | `/data/servers.json` | 30s | `settings.refreshInterval` (default 30s) |
| `useServer(id)` | `['servers', id]` | derived from `useServers` (select) | 30s | inherits |
| `usePeers(sid)` | `['peers', sid]` | `/data/servers/{sid}/peers.json` | 30s | `refreshInterval` |
| `usePeerConfig(sid,pid)` | `['config', sid, pid]` | `.../peers/{pid}/config.json` | `Infinity` | off (config rarely changes) |
| `usePeerHistory(sid,pid)` | `['history', sid, pid]` | `.../history.json` | 60s | `refreshInterval` |
| `useAllPeers()` (topology) | `['peers','all']` | fan-out via `useQueries` over server ids | 30s | `refreshInterval` |

- `refetchOnWindowFocus: true`, `retry: 2` with exponential backoff, except `SchemaError` → `retry: false`.
- `gcTime: 5min`. Polling is paused when `document.hidden`.
- History query uses `enabled: !!historyExists` guard; 404 is treated as "no history," not an error.

## 5. Zustand Store

`@/store/settings.ts`, persisted to `localStorage` via `persist` middleware.

```ts
interface SettingsState {
  dataSourceUrl: string;      // default "/data"
  refreshInterval: number;    // ms, default 30000
  theme: 'dark';              // dark only; field reserved for future
  setDataSourceUrl: (u: string) => void;
  setRefreshInterval: (ms: number) => void;
}
```

`partialize` persists only `dataSourceUrl` and `refreshInterval`. A `version` + `migrate` is included for forward-compat. The QueryClient reads `refreshInterval` reactively via a selector so changing it in Settings re-tunes all polling queries.

## 6. Component Tree

```
AppShell                 — grid: sidebar | (topbar / outlet); holds ErrorBoundary + skip link
├─ Sidebar               — branding, nav links, active route highlight, collapsible
├─ Topbar                — page title (from route handle), refresh button (invalidates queries), global status dot
└─ <Outlet/>
   ├─ Dashboard
   │  ├─ SummaryCards         — 4 KPI cards: servers, peers, online peers, total transfer
   │  ├─ ServerHealthMatrix   — responsive grid of compact server status cards
   │  └─ RecentActivityTimeline — newest handshakes across all servers, relative time
   ├─ ServerList
   │  └─ ServerCard[]         — name, iface, peer/online counts, status badge
   ├─ ServerDetail
   │  ├─ StatsRail            — listen port, address, peer totals, transfer, snapshot age
   │  ├─ PeerTable            — search + sort, health indicators, row links
   │  └─ ArchiveList          — optional config-change history
   ├─ PeerDetail
   │  ├─ ConfigDisplay        — ini-style syntax-highlighted .conf, copy button
   │  ├─ QRCode               — canvas-generated from conf string
   │  ├─ TransferChart        — RX/TX over time (recharts) from history.json
   │  └─ ConnectionInfo       — endpoint, handshake age, keepalive, PSK flag
   ├─ Topology
   │  └─ NetworkGraph         — force-directed (D3) servers=hubs, peers=nodes
   ├─ Export
   │  └─ ConfigDownloadList   — per-peer download .conf buttons, "download all" (zip)
   ├─ Settings
   │  └─ SettingsForm         — data source URL, refresh interval, validation
   └─ NotFound                — 404
```

## 7. Code Splitting

`AppShell`, `Sidebar`, `Topbar`, and shared primitives ship in the main bundle. Every route element is `React.lazy` + `<Suspense fallback={<RouteSkeleton/>}>`:

```ts
const Dashboard   = lazy(() => import('@/routes/Dashboard'));
const ServerList  = lazy(() => import('@/routes/ServerList'));
const ServerDetail = lazy(() => import('@/routes/ServerDetail'));
const PeerDetail  = lazy(() => import('@/routes/PeerDetail'));
const Topology    = lazy(() => import('@/routes/Topology'));
const Export      = lazy(() => import('@/routes/Export'));
const Settings    = lazy(() => import('@/routes/Settings'));
```

Heaviest deps are isolated so they only load with their route: **D3** (Topology), **recharts** (PeerDetail), **qrcode** (PeerDetail), **jszip** (Export "download all"). Each route is its own Suspense boundary so a slow chunk never blocks the shell. A top-level `ErrorBoundary` wraps `<Outlet/>`; per-route boundaries wrap chart/graph widgets so one failing visualization doesn't take down the page.

## 8. Deploy Strategy

**Vercel**, framework preset Vite. SPA rewrite so deep links resolve client-side:

`vercel.json`
```json
{
  "rewrites": [{ "source": "/((?!data/).*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/data/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=15, must-revalidate" }] }
  ]
}
```

The negative lookahead keeps `/data/*` JSON served as real files, not rewritten to the app shell.

**GitHub Actions CI** (`.github/workflows/ci.yml`): on push/PR → `pnpm install` → `tsc --noEmit` → `eslint` → `vitest run` (schema round-trip tests) → `pnpm build`. Vercel's Git integration handles deploy on merge to `main`; CI is the gate.

## 9. Shift-Computation-to-Write-Time

The app does zero server-side computation at request time. An **external cron job on the WireGuard host** (a shell/Python script, not part of this repo) runs every N seconds:

1. Executes `wg show all dump` and reads each `wg-quick` config.
2. Parses raw output and **precomputes everything the UI would otherwise derive**: `handshakeAgeSeconds`, `health` (online if handshake < 180s, degraded if 180s–600s, offline beyond), per-server `peerCount`/`onlinePeerCount`, `totalRx/TxBytes` rollups.
3. Writes the JSON tree:
   ```
   /public/data/servers.json
   /public/data/servers/{serverId}/peers.json
   /public/data/servers/{serverId}/peers/{peerId}/config.json
   /public/data/servers/{serverId}/peers/{peerId}/history.json   (appends a snapshot, ring-buffered)
   ```
4. Each file carries `generatedAt`/`lastUpdated` so the UI can show snapshot age and flag staleness.

`history.json` is the only file that *accumulates* (append + trim to last ~500 points) so the transfer chart has a series without any DB. The frontend treats all of this as immutable read-only data; "freshness" is purely a function of how recently the cron last wrote. This keeps the client trivial: fetch → validate → render, with handshake age relative-time recomputed client-side only for display tick (since absolute timestamps are in the data).
