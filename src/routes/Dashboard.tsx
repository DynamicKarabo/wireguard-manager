import { useServers, useAllPeers } from '@/lib/hooks';
import { formatBytes, ago } from '@/lib/client';
import { Link } from 'react-router-dom';
import type { Server, Peer } from '@/types';

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 600, color: accent ?? 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

function ServerHealthCard({ server, peerCount, onlineCount }: { server: Server; peerCount: number; onlineCount: number }) {
  const statusColor = server.status === 'active' ? 'var(--status-online)' : 'var(--status-offline)';
  return (
    <Link
      to={`/servers/${server.id}`}
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{server.name}</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: statusColor,
          }}
          aria-label={`Status: ${server.status}`}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} aria-hidden="true" />
          {server.status}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {server.interface} :{server.listenPort}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>{onlineCount}/{peerCount} online</span>
        <span>{formatBytes(server.totalRxBytes)} RX</span>
      </div>
    </Link>
  );
}

function RecentActivity({ allPeers }: { allPeers: Peer[] }) {
  const recent = [...allPeers]
    .filter((p) => p.latestHandshake)
    .sort((a, b) => new Date(b.latestHandshake!).getTime() - new Date(a.latestHandshake!).getTime())
    .slice(0, 10);

  if (recent.length === 0) {
    return <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No recent activity</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {recent.map((peer) => (
        <div
          key={peer.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: peer.health === 'online' ? 'var(--status-online)' : peer.health === 'degraded' ? 'var(--status-degraded)' : 'var(--status-offline)',
              }}
              aria-hidden="true"
            />
            <Link to={`/servers/${peer.serverId}/peers/${peer.id}`} style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {peer.name}
            </Link>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {ago(peer.latestHandshake!)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: servers, isLoading: serversLoading, error: serversError } = useServers();
  const { peers: allPeers, isLoading: peersLoading } = useAllPeers(servers);

  if (serversLoading || peersLoading) return <DashboardSkeleton />;
  if (serversError) return <ErrorDisplay message={(serversError as Error).message} />;

  const totalServers = servers?.length ?? 0;
  const activeServers = servers?.filter((s) => s.status === 'active').length ?? 0;
  const totalPeers = allPeers.length;
  const onlinePeers = allPeers.filter((p) => p.health === 'online').length;
  const totalTransfer = allPeers.reduce((acc, p) => acc + p.rxBytes + p.txBytes, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <SummaryCard label="Servers" value={`${activeServers}/${totalServers}`} />
        <SummaryCard label="Peers" value={`${onlinePeers}/${totalPeers}`} />
        <SummaryCard label="Online" value={`${onlinePeers}`} accent="var(--status-online)" />
        <SummaryCard label="Total Transfer" value={formatBytes(totalTransfer)} />
      </div>

      {/* Server health matrix */}
      <section aria-label="Server health matrix">
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Servers</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {servers?.map((server) => (
            <ServerHealthCard
              key={server.id}
              server={server}
              peerCount={server.peerCount}
              onlineCount={server.onlinePeerCount}
            />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section aria-label="Recent activity">
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Recent Activity</h2>
        <div
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '0 20px',
          }}
        >
          <RecentActivity allPeers={allPeers} />
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '16px 20px', height: 80 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div style={{ color: 'var(--status-offline)', padding: 'var(--space-4)' }}>
      Error: {message}
    </div>
  );
}
