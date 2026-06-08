export type ServerStatus = 'active' | 'inactive';
export type PeerHealth = 'online' | 'offline' | 'degraded';

export interface Server {
  id: string;
  name: string;
  interface: string;
  publicKey: string;
  address: string;
  listenPort: number;
  status: ServerStatus;
  peerCount: number;
  onlinePeerCount: number;
  totalRxBytes: number;
  totalTxBytes: number;
  lastUpdated: string;
}

export interface Peer {
  id: string;
  serverId: string;
  name: string;
  publicKey: string;
  allowedIps: string[];
  endpoint: string | null;
  latestHandshake: string | null;
  handshakeAgeSeconds: number | null;
  rxBytes: number;
  txBytes: number;
  persistentKeepalive: number | null;
  enabled: boolean;
  usesPresharedKey: boolean;
  health: PeerHealth;
}

export interface PeerConfig {
  peerId: string;
  conf: string;
  fileName: string;
}

export interface HistorySnapshot {
  t: string;
  rxBytes: number;
  txBytes: number;
  handshakeAgeSeconds: number | null;
}

export interface PeerHistory {
  peerId: string;
  snapshots: HistorySnapshot[];
}

export interface ServersFile {
  servers: Server[];
  generatedAt: string;
}

export interface PeersFile {
  serverId: string;
  peers: Peer[];
  generatedAt: string;
}
