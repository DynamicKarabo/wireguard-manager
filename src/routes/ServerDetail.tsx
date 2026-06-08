import { useParams, Link } from 'react-router-dom';
import { useServer, usePeers } from '@/lib/hooks';
import { formatBytes, formatHandshakeAge } from '@/lib/client';
import type { Peer } from '@/types';

function PeerRow({ peer }: { peer: Peer }) {
  const healthColor =
    peer.health === 'online' ? 'var(--status-online)' :
    peer.health === 'degraded' ? 'var(--status-degraded)' : 'var(--status-offline)';
  const healthShape =
    peer.health === 'online' ? '●' :
    peer.health === 'degraded' ? '▲' : '○';

  return (
    <Link
      to={`peers/${peer.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr',
        gap: 'var(--space-3)',
        padding: '10px var(--space-4)',
        borderBottom: '1px solid var(--border-subtle)',
        textDecoration: 'none',
        color: 'inherit',
        alignItems: 'center',
        fontSize: 13,
      }}
      aria-label={`Peer ${peer.name}, status ${peer.health}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: healthColor }} aria-hidden="true">{healthShape}</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{peer.name}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 12 }}>
        {peer.allowedIps.join(', ')}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 12 }}>
        {peer.endpoint ?? '—'}
      </span>
      <span style={{ color: peer.handshakeAgeSeconds !== null && peer.handshakeAgeSeconds < 180 ? 'var(--text-secondary)' : 'var(--status-offline)' }}>
        {formatHandshakeAge(peer.handshakeAgeSeconds)}
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {formatBytes(peer.rxBytes)} / {formatBytes(peer.txBytes)}
      </span>
    </Link>
  );
}

export default function ServerDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: server, isLoading: serverLoading, error: serverError } = useServer(id ?? '');
  const { data: peers, isLoading: peersLoading, error: peersError } = usePeers(id ?? '');

  if (serverLoading || peersLoading) return <div style={{ color: 'var(--text-tertiary)' }}>Loading...</div>;
  if (serverError) return <div style={{ color: 'var(--status-offline)' }}>Error: {(serverError as Error).message}</div>;
  if (!server) return <div style={{ color: 'var(--status-offline)' }}>Server not found.</div>;

  const sortedPeers = [...(peers ?? [])].sort((a, b) => {
    const order = { online: 0, degraded: 1, offline: 2 };
    return (order[a.health] ?? 0) - (order[b.health] ?? 0);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Stats rail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {[
          { label: 'Interface', value: server.interface, mono: true },
          { label: 'Address', value: server.address, mono: true },
          { label: 'Listen Port', value: String(server.listenPort) },
          { label: 'Peers', value: `${server.onlinePeerCount}/${server.peerCount} online` },
          { label: 'Total RX', value: formatBytes(server.totalRxBytes) },
          { label: 'Total TX', value: formatBytes(server.totalTxBytes) },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{stat.label}</span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: stat.mono ? 'var(--font-mono)' : 'var(--font-system)',
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Peer table */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Peers ({peers?.length ?? 0})</h2>
        {peersError ? (
          <div style={{ color: 'var(--status-offline)' }}>Error: {(peersError as Error).message}</div>
        ) : !peers?.length ? (
          <div style={{ color: 'var(--text-tertiary)' }}>No peers configured.</div>
        ) : (
          <div
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr',
                gap: 'var(--space-3)',
                padding: '10px var(--space-4)',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span>Name</span>
              <span>Allowed IPs</span>
              <span>Endpoint</span>
              <span>Handshake</span>
              <span>Transfer</span>
            </div>
            {sortedPeers.map((peer) => (
              <PeerRow key={peer.id} peer={peer} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
