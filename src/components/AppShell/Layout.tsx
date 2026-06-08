import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import ErrorBoundary from '@/components/ErrorBoundary';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/servers': 'Servers',
  '/topology': 'Topology',
  '/export': 'Export',
  '/settings': 'Settings',
};

export function Layout() {
  const location = useLocation();
  const title = routeTitles[location.pathname] ?? routeTitles['/'] ?? 'WireGuard Manager';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar title={title} />
        <main
          id="main-content"
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--bg-canvas)',
            padding: 'var(--space-6)',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
