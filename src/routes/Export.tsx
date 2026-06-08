import { useCallback } from 'react';
import { useServers, usePeers, usePeerConfig } from '@/lib/hooks';
import { formatHandshakeAge } from '@/lib/client';
import type { Peer } from '@/types';

function ConfigDownloadRow({ peer, serverId }: { peer: Peer; serverId: string }) {
  const { data: config, isLoading } = usePeerConfig(serverId, peer.id);

  const handleDownload = useCallback(() => {
    if (!config) return;
    const blob = new Blob([config.conf], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = config.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const healthColor =
    peer.health === 'online' ? 'var(--status-online)' :
    peer.health === 'degraded' ? 'var(--status-degraded)' : 'var(--status-offline)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: healthColor, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>{peer.name}</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {peer.allowedIps.join(', ')} &middot; {formatHandshakeAge(peer.handshakeAgeSeconds)}
          </div>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={isLoading || !config}
        aria-label={`Download config for ${peer.name}`}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          padding: '6px 14px',
          cursor: config ? 'pointer' : 'not-allowed',
          opacity: config ? 1 : 0.5,
          fontSize: 13,
          flexShrink: 0,
          fontWeight: 500,
        }}
      >
        {isLoading ? 'Loading...' : 'Download'}
      </button>
    </div>
  );
}

export default function Export() {
  const { data: servers, isLoading: sLoading } = useServers();
  const mainServer = servers?.[0];

  const { data: peers, isLoading: pLoading } = usePeers(mainServer?.id ?? '');

  if (sLoading) return <div style={{ color: 'var(--text-tertiary)' }}>Loading...</div>;
  if (!servers?.length) return <div style={{ color: 'var(--text-tertiary)' }}>No servers configured.</div>;

  const enabledPeers = peers?.filter((p) => p.enabled) ?? [];
  const disabledPeers = peers?.filter((p) => !p.enabled) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
        Download individual .conf files for each peer. These are compatible with the WireGuard mobile app and wg-quick.
      </p>

      {/* Active peers */}
      <section>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>
          Active Peers ({enabledPeers.length})
        </h2>
        <div
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '0 var(--space-5)',
          }}
        >
          {pLoading ? (
            <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Loading peers...</div>
          ) : enabledPeers.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No active peers.</div>
          ) : (
            enabledPeers.map((peer) => (
              <ConfigDownloadRow key={peer.id} peer={peer} serverId={mainServer!.id} />
            ))
          )}
        </div>
      </section>

      {/* Disabled peers */}
      {disabledPeers.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Disabled Peers ({disabledPeers.length})</h2>
          <div
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '0 var(--space-5)',
              opacity: 0.6,
            }}
          >
            {disabledPeers.map((peer) => (
              <ConfigDownloadRow key={peer.id} peer={peer} serverId={mainServer!.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
