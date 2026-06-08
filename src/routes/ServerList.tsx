import { Link } from 'react-router-dom';
import { useServers } from '@/lib/hooks';
import type { Server } from '@/types';

function ServerCard({ server }: { server: Server }) {
  const isActive = server.status === 'active';
  const statusColor = isActive ? 'var(--status-online)' : 'var(--status-offline)';
  const statusIcon = isActive ? '●' : '○';

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
          style={{ fontSize: 13, color: statusColor, display: 'flex', alignItems: 'center', gap: 4 }}
          role="status"
          aria-label={`Server ${server.name} is ${server.status}`}
        >
          {statusIcon} {server.status}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {server.interface} &middot; {server.address} &middot; :{server.listenPort}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        {server.onlinePeerCount}/{server.peerCount} peers online
      </div>
    </Link>
  );
}

export default function ServerList() {
  const { data: servers, isLoading, error } = useServers();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '16px 20px', height: 100 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'var(--status-offline)' }}>Failed to load servers: {(error as Error).message}</div>;
  }

  if (!servers?.length) {
    return <div style={{ color: 'var(--text-tertiary)' }}>No servers configured.</div>;
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>
    </div>
  );
}
