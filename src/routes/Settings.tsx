import { useSettings } from '@/store/settings';

export default function Settings() {
  const {
    dataSourceUrl,
    refreshInterval,
    setDataSourceUrl,
    setRefreshInterval,
  } = useSettings();

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Data Source</h2>
        <div
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="data-url" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Data Source URL
            </label>
            <input
              id="data-url"
              type="text"
              value={dataSourceUrl}
              onChange={(e) => setDataSourceUrl(e.target.value)}
              className="input"
              placeholder="/data"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                font: '400 14px/20px var(--font-system)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Base URL for WireGuard status JSON files. Default: <code>/data</code>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="refresh-interval" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Refresh Interval (ms)
            </label>
            <input
              id="refresh-interval"
              type="number"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Math.max(5000, Number(e.target.value)))}
              className="input"
              min={5000}
              step={5000}
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                font: '400 14px/20px var(--font-system)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              How often to poll for new data. Minimum 5000ms. Current: {(refreshInterval / 1000).toFixed(0)}s
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>About</h2>
        <div
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: '16px 20px',
            color: 'var(--text-secondary)',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>WireGuard Manager</strong> — A strictly frontend SPA for monitoring and managing
            WireGuard VPN peers. No backend required: a cron job dumps <code>wg show</code> output to
            static JSON files, and this dashboard reads them.
          </p>
          <p style={{ margin: '12px 0 0 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Snapshot data freshness depends on how often the server-side cron writes JSON files.
            The dashboard does not directly query WireGuard interfaces.
          </p>
        </div>
      </section>
    </div>
  );
}
