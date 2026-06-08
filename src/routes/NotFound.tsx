import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--space-4)',
        color: 'var(--text-tertiary)',
      }}
    >
      <span style={{ fontSize: 64, fontWeight: 700, color: 'var(--border-strong)' }}>404</span>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0 }}>Page not found</p>
      <Link
        to="/"
        style={{
          color: 'var(--accent)',
          fontSize: 14,
          padding: '8px 16px',
          border: '1px solid var(--accent-muted)',
          borderRadius: 6,
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
