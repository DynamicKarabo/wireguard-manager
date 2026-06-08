import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchJson } from './client';
import {
  ServersFileSchema,
  PeersFileSchema,
  PeerConfigSchema,
  PeerHistorySchema,
} from './schemas';
import type { Server, Peer, PeerHistory } from '@/types';
import { useSettings } from '@/store/settings';

function dataUrl(path: string): string {
  const base = useSettings.getState().dataSourceUrl;
  return `${base}${path}`;
}

export function useServers() {
  const refreshInterval = useSettings((s) => s.refreshInterval);
  return useQuery({
    queryKey: ['servers'],
    queryFn: ({ signal }) =>
      fetchJson(dataUrl('/servers.json'), ServersFileSchema, signal).then((f) => f.servers),
    staleTime: 30_000,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ['servers', id],
    queryFn: ({ signal }) =>
      fetchJson(dataUrl('/servers.json'), ServersFileSchema, signal)
        .then((f) => f.servers.find((s) => s.id === id) ?? null),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function usePeers(serverId: string) {
  const refreshInterval = useSettings((s) => s.refreshInterval);
  return useQuery({
    queryKey: ['peers', serverId],
    queryFn: ({ signal }) =>
      fetchJson(
        dataUrl(`/servers/${serverId}/peers.json`),
        PeersFileSchema,
        signal,
      ).then((f) => f.peers),
    staleTime: 30_000,
    refetchInterval: refreshInterval,
    enabled: !!serverId,
  });
}

export function usePeerConfig(serverId: string, peerId: string) {
  return useQuery({
    queryKey: ['config', serverId, peerId],
    queryFn: ({ signal }) =>
      fetchJson(
        dataUrl(`/servers/${serverId}/peers/${peerId}/config.json`),
        PeerConfigSchema,
        signal,
      ),
    staleTime: Infinity,
    enabled: !!serverId && !!peerId,
  });
}

export function usePeerHistory(serverId: string, peerId: string) {
  const refreshInterval = useSettings((s) => s.refreshInterval);
  return useQuery({
    queryKey: ['history', serverId, peerId],
    queryFn: async ({ signal }) => {
      try {
        return await fetchJson(
          dataUrl(`/servers/${serverId}/peers/${peerId}/history.json`),
          PeerHistorySchema,
          signal,
        );
      } catch (e) {
        if (e instanceof Response && e.status === 404) return null;
        // Treat non-404 fetch failures as "no history" for graceful degradation
        if (e instanceof Error && e.message.includes('HTTP 404')) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    refetchInterval: refreshInterval,
    // Transform history into a series so failure returns empty gracefully
    select: (data: PeerHistory | null): PeerHistory | null => data,
    enabled: !!serverId && !!peerId,
  });
}

export function useAllPeers(servers: Server[] | undefined) {
  const refreshInterval = useSettings((s) => s.refreshInterval);
  const serverIds = servers?.map((s) => s.id) ?? [];

  const results = useQueries({
    queries: serverIds.map((id) => ({
      queryKey: ['peers', id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchJson(dataUrl(`/servers/${id}/peers.json`), PeersFileSchema, signal)
          .then((f) => f.peers),
      staleTime: 30_000,
      refetchInterval: refreshInterval,
      enabled: !!id,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const allPeers: Peer[] = results.flatMap((r) => r.data ?? []);
  const errors = results.filter((r) => r.error).map((r) => r.error);

  return { peers: allPeers, isLoading, errors };
}
