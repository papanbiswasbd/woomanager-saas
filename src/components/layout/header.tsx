'use client';

import { useState, useEffect } from 'react';
import { Bell, User as UserIcon, RefreshCw, LogOut, Store as StoreIcon, ShieldCheck } from 'lucide-react';
import { useIsFetching } from '@tanstack/react-query';
import { SyncOrdersButton } from '@/components/sync-orders-button';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettingsStore } from '@/lib/store';

export default function Header() {
  const isFetching = useIsFetching();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [hasStore, setHasStore] = useState<boolean>(true);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          setHasStore(data.hasStoreConnected);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      useSettingsStore.getState().setSettings({
        storeUrl: '',
        consumerKey: '',
        consumerSecret: '',
        webhooksRegistered: false,
      });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (e) {}
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold md:hidden">WooManager</h1>
        {!hasStore && pathname !== '/settings' && user && (
          <Link
            href="/settings"
            className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-amber-500/20 transition"
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Connect your Store in Settings</span>
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isFetching > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mr-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Syncing...</span>
          </div>
        )}

        {pathname === '/orders' && <SyncOrdersButton />}

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-full transition"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
            </div>
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setShowDropdown(false)}
            >
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowDropdown(false)}
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg flex items-center gap-2 transition"
                    >
                      <StoreIcon className="w-3.5 h-3.5" />
                      <span>Store Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-1 space-y-1">
                  <Link
                    href="/login"
                    onClick={() => setShowDropdown(false)}
                    className="block px-3 py-2 text-xs text-center font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setShowDropdown(false)}
                    className="block px-3 py-2 text-xs text-center font-medium border border-border text-foreground rounded-lg hover:bg-accent transition"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
