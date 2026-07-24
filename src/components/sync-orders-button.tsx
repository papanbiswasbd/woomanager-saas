'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/store';

export function SyncOrdersButton() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, totalPages: 0, totalSynced: 0 });

  const handleSync = async () => {
    if (!storeUrl || !consumerKey) {
      alert("Please configure WooCommerce settings first.");
      return;
    }
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, totalPages: 0, totalSynced: 0 });
    let syncPage = 1;
    let hasMore = true;
    let totalSynced = 0;

    try {
      while (hasMore) {
        const res = await fetch('/api/sync/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: storeUrl, consumerKey, consumerSecret, page: syncPage })
        });
        const syncData = await res.json();
        
        if (!res.ok) {
          throw new Error(syncData.message || 'Failed to sync orders');
        }

        totalSynced += syncData.count;
        hasMore = syncData.hasMore;
        setSyncProgress({ current: syncPage, totalPages: syncData.totalPages, totalSynced });
        syncPage++;
      }
      alert(`Successfully synced ${totalSynced} orders to local database!`);
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, totalPages: 0, totalSynced: 0 });
    }
  };

  const percentage = syncProgress.totalPages > 0 
    ? Math.round((syncProgress.current / syncProgress.totalPages) * 100) 
    : 0;

  return (
    <button 
      onClick={handleSync} 
      disabled={isSyncing}
      className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 shrink-0"
    >
      {isSyncing ? `Syncing... ${percentage > 0 ? percentage + '%' : ''}` : 'Sync Orders'}
    </button>
  );
}
