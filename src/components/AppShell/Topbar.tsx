import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServers } from '@/lib/hooks';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const queryClient = useQueryClient();
  const { data: servers } = useServers();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  const hasOnline = servers?.some((s) => s.status === 'active');

  return (
    <header
      style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        flexShrink: 0,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Global status */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          aria-label={hasOnline ? 'VPN active' : 'VPN inactive'}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: hasOnline ? 'var(--status-online)' : 'var(--status-offline)',
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {hasOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          aria-label="Refresh data"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </header>
  );
}
