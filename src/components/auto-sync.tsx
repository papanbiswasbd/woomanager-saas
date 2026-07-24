'use client';

import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/lib/store';

export function AutoSync() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Only run if connected
    if (!storeUrl || !consumerKey || !consumerSecret) return;

    const runSync = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const payload = JSON.stringify({ url: storeUrl, consumerKey, consumerSecret, page: 1 });
        const headers = { 'Content-Type': 'application/json' };

        // We only trigger page 1 for the background sync, because our Delta Sync logic
        // fetches everything modified_after the last record. If there are massive changes, 
        // they should use the manual sync button. For real-time updates, page 1 is enough.
        
        await Promise.allSettled([
          fetch('/api/sync/orders', { method: 'POST', headers, body: payload }),
          fetch('/api/sync/products', { method: 'POST', headers, body: payload }),
          fetch('/api/sync/customers', { method: 'POST', headers, body: payload }),
        ]);
        
      } catch (error) {
        console.error("AutoSync Error:", error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run immediately on mount
    runSync();

    // Then run every 15 seconds
    const interval = setInterval(runSync, 15000);

    return () => clearInterval(interval);
  }, [storeUrl, consumerKey, consumerSecret]);

  return null; // Invisible background component
}
