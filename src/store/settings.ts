import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  dataSourceUrl: string;
  refreshInterval: number;
  theme: 'dark';
  sidebarCollapsed: boolean;
  setDataSourceUrl: (url: string) => void;
  setRefreshInterval: (ms: number) => void;
  toggleSidebar: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      dataSourceUrl: '/data',
      refreshInterval: 30_000,
      theme: 'dark' as const,
      sidebarCollapsed: false,
      setDataSourceUrl: (url) => set({ dataSourceUrl: url }),
      setRefreshInterval: (ms) => set({ refreshInterval: ms }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'wg-settings',
      version: 1,
      partialize: (state) => ({
        dataSourceUrl: state.dataSourceUrl,
        refreshInterval: state.refreshInterval,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (version === 0) {
          return {
            dataSourceUrl: '/data',
            refreshInterval: 30_000,
            theme: 'dark' as const,
            sidebarCollapsed: false,
            setDataSourceUrl: () => {},
            setRefreshInterval: () => {},
            toggleSidebar: () => {},
          };
        }
        return persisted as SettingsState;
      },
    },
  ),
);
