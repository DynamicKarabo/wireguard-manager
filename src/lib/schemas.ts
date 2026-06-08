import { z } from 'zod';

export const ServerStatusSchema = z.enum(['active', 'inactive']);
export const PeerHealthSchema = z.enum(['online', 'offline', 'degraded']);

export const ServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  interface: z.string(),
  publicKey: z.string().length(44),
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
  fileName: z.string(),
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
