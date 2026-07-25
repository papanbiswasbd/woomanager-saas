import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  webhooksRegistered?: boolean;
  
  shopLogoUrl?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  invoiceFooterText?: string;
  
  setSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storeUrl: '',
      consumerKey: '',
      consumerSecret: '',
      webhooksRegistered: false,
      shopLogoUrl: '',
      shopName: '',
      shopAddress: '',
      shopPhone: '',
      invoiceFooterText: '',
      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'woo-manager-settings',
    }
  )
);
