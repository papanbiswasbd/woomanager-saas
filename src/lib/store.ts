import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  webhooksRegistered?: boolean;
  setSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storeUrl: '',
      consumerKey: '',
      consumerSecret: '',
      webhooksRegistered: false,
      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'woo-manager-settings',
    }
  )
);
