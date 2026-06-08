import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useRef } from 'react';
import { usePeerConfig, usePeerHistory, usePeers } from '@/lib/hooks';
import { formatBytes, formatHandshakeAge } from '@/lib/client';
import QRCode from 'qrcode';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ConfigDisplay({ conf }: { conf: string }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(conf);
  }, [conf]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        aria-label="Copy configuration"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'var(--bg-active)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Copy
      </button>
      <pre
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          padding: 'var(--space-4)',
          font: '400 13px/20px var(--font-mono)',
          color: 'var(--text-secondary)',
          overflow: 'auto',
          maxHeight: 400,
          whiteSpace: 'pre',
          tabSize: 2,
        }}
      >
        {conf}
      </pre>
    </div>
  );
}

function QRDisplay({ conf }: { conf: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && conf) {
      QRCode.toCanvas(canvasRef.current, conf, {
        width: 256,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: { dark: '#0b0d0e', light: '#ffffff' },
      });
    }
  }, [conf]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
      <div
        style={{
          background: '#ffffff',
          padding: 'var(--space-4)',
          borderRadius: 6,
          width: 'max-content',
        }}
      >
        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          role="img"
          aria-label="QR code for peer configuration"
          style={{ display: 'block' }}
        />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        Scan with WireGuard mobile app
      </span>
    </div>
  );
}

function TransferChart({ history }: { history: NonNullable<ReturnType<typeof usePeerHistory>['data']> }) {
  if (!history?.snapshots?.length) {
    return <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No transfer history available.</div>;
  }

  const data = history.snapshots.map((s) => ({
    time: new Date(s.t).getTime(),
    rx: s.rxBytes,
    tx: s.txBytes,
  }));

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="time"
            tickFormatter={(t) => {
              const d = new Date(t);
              return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
            }}
            stroke="var(--text-tertiary)"
            fontSize={12}
          />
          <YAxis
            tickFormatter={(v) => formatBytes(v)}
            stroke="var(--text-tertiary)"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
            labelFormatter={(t) => new Date(t).toLocaleTimeString()}
          />
          <Line type="monotone" dataKey="rx" stroke="#3B8EA5" strokeWidth={2} dot={false} name="RX" />
          <Line type="monotone" dataKey="tx" stroke="#4caf7e" strokeWidth={2} dot={false} name="TX" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PeerDetail() {
  const { sid, pid } = useParams<{ sid: string; pid: string }>();
  const navigate = useNavigate();
  const { data: peers } = usePeers(sid ?? '');
  const { data: config, isLoading: configLoading } = usePeerConfig(sid ?? '', pid ?? '');
  const { data: history } = usePeerHistory(sid ?? '', pid ?? '');

  const peer = peers?.find((p) => p.id === pid);

  if (!peer) {
    return <div style={{ color: 'var(--status-offline)' }}>Peer not found.</div>;
  }

  const healthColor =
    peer.health === 'online' ? 'var(--status-online)' :
    peer.health === 'degraded' ? 'var(--status-degraded)' : 'var(--status-offline)';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
        <a
          href={`/servers/${sid}`}
          onClick={(e) => { e.preventDefault(); navigate(`/servers/${sid}`); }}
          style={{ color: 'var(--accent)' }}
        >
          {sid}
        </a>
        {' / '}
        <span>{peer.name}</span>
      </div>

      {/* Stats rail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {[
          { label: 'Status', value: peer.health, color: healthColor },
          { label: 'Allowed IPs', value: peer.allowedIps.join(', ') },
          { label: 'Endpoint', value: peer.endpoint ?? 'Not connected' },
          { label: 'Handshake', value: formatHandshakeAge(peer.handshakeAgeSeconds) },
          { label: 'Transfer', value: `${formatBytes(peer.rxBytes)} / ${formatBytes(peer.txBytes)}` },
          { label: 'Keepalive', value: peer.persistentKeepalive ? `${peer.persistentKeepalive}s` : 'Off' },
          { label: 'Preshared Key', value: peer.usesPresharedKey ? 'Enabled' : 'Disabled' },
          { label: 'Public Key', value: peer.publicKey.slice(0, 20) + '…', mono: true },
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
                color: stat.color ?? 'var(--text-primary)',
                fontFamily: stat.mono ? 'var(--font-mono)' : 'var(--font-system)',
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Config + QR side by side */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        <section>
          <h3 style={{ marginBottom: 'var(--space-3)' }}>Configuration</h3>
          {configLoading ? (
            <div style={{ color: 'var(--text-tertiary)' }}>Loading config...</div>
          ) : config ? (
            <ConfigDisplay conf={config.conf} />
          ) : (
            <div style={{ color: 'var(--text-tertiary)' }}>No configuration available.</div>
          )}
        </section>

        <section>
          <h3 style={{ marginBottom: 'var(--space-3)' }}>QR Code</h3>
          {config ? (
            <QRDisplay conf={config.conf} />
          ) : (
            <div style={{ color: 'var(--text-tertiary)' }}>Load config to generate QR code.</div>
          )}
        </section>
      </div>

      {/* Download button */}
      <div>
        <button
          onClick={handleDownload}
          disabled={!config}
          style={{
            background: 'var(--accent)',
            color: '#0b0d0e',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: config ? 'pointer' : 'not-allowed',
            opacity: config ? 1 : 0.5,
            fontSize: 14,
          }}
        >
          Download {config?.fileName ?? '.conf'}
        </button>
      </div>

      {/* Transfer chart */}
      <section aria-label="Transfer history">
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Transfer History</h3>
        <div
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: 'var(--space-4)',
          }}
        >
          <TransferChart history={history ?? { peerId: pid ?? '', snapshots: [] }} />
        </div>
      </section>
    </div>
  );
}
