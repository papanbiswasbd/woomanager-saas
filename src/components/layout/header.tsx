'use client';

import { Bell, User, RefreshCw } from 'lucide-react';
import { useIsFetching } from '@tanstack/react-query';
import { SyncOrdersButton } from '@/components/sync-orders-button';
import { usePathname } from 'next/navigation';

export default function Header() {
  const isFetching = useIsFetching();
  const pathname = usePathname();

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold md:hidden">WooManager</h1>
      </div>
      <div className="flex items-center gap-4">
        {isFetching > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mr-4">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing...</span>
          </div>
        )}
        
        {pathname === '/orders' && <SyncOrdersButton />}
        <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors">
          <User className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
