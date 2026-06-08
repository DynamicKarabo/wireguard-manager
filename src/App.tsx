import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/AppShell/Layout';

const Dashboard = lazy(() => import('@/routes/Dashboard'));
const ServerList = lazy(() => import('@/routes/ServerList'));
const ServerDetail = lazy(() => import('@/routes/ServerDetail'));
const PeerDetail = lazy(() => import('@/routes/PeerDetail'));
const Topology = lazy(() => import('@/routes/Topology'));
const Export = lazy(() => import('@/routes/Export'));
const Settings = lazy(() => import('@/routes/Settings'));
const NotFound = lazy(() => import('@/routes/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

function RouteSkeleton() {
  return (
    <div style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteSkeleton />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="servers" element={<ServerList />} />
              <Route path="servers/:id" element={<ServerDetail />} />
              <Route path="servers/:sid/peers/:pid" element={<PeerDetail />} />
              <Route path="topology" element={<Topology />} />
              <Route path="export" element={<Export />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
