'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/store';
import Link from 'next/link';
import { useCustomers } from '@/hooks/use-customers';
import { Loader2, Mail, MapPin, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomersPage() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, totalPages: 0, totalSynced: 0 });
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading, isFetching, refetch } = useCustomers({ page, perPage });

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, totalPages: 0, totalSynced: 0 });
    let syncPage = 1;
    let hasMore = true;
    let totalSynced = 0;

    try {
      while (hasMore) {
        const res = await fetch('/api/sync/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: storeUrl, consumerKey, consumerSecret, page: syncPage })
        });
        const responseData = await res.json();
        
        if (!res.ok) {
          throw new Error(responseData.message || 'Failed to sync customers');
        }

        totalSynced += responseData.count;
        hasMore = responseData.hasMore;
        setSyncProgress({ current: syncPage, totalPages: responseData.totalPages, totalSynced });
        syncPage++;
      }
      refetch(); // Refresh list after sync
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, totalPages: 0, totalSynced: 0 });
    }
  };

  if (!storeUrl || !consumerKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Not Connected</h2>
        <p className="text-muted-foreground">Please configure your WooCommerce API credentials in Settings.</p>
        <Link 
          href="/settings"
          className="h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  const { customers = [], totalPages = 1 } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          Customers
          {isFetching && !isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </h1>
        <button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {isSyncing ? 'Syncing...' : 'Sync Customers'}
        </button>
      </div>

      {isSyncing && syncProgress.totalPages > 0 && (
        <div className="bg-card border rounded-lg p-4 shadow-sm space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Syncing Customers...</span>
            <span>{Math.round((syncProgress.current / syncProgress.totalPages) * 100)}% ({syncProgress.totalSynced} items)</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-in-out" 
              style={{ width: `${Math.min(100, Math.round((syncProgress.current / syncProgress.totalPages) * 100))}%` }}
            ></div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-card border rounded-lg p-8 shadow-sm text-center text-muted-foreground">
          No customers found. Click "Sync Customers" to fetch them from WooCommerce.
        </div>
      ) : (
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden relative">
          {/* Faint loading overlay when fetching next page */}
          {isFetching && !isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {customer.first_name || customer.last_name 
                              ? `${customer.first_name} ${customer.last_name}`.trim() 
                              : customer.username || 'Guest'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: #{customer.id} • Registered {format(new Date(customer.date_created), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{customer.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">
                          {[customer.billing?.city, customer.billing?.state, customer.billing?.country].filter(Boolean).join(', ') || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {customer.orders_count} orders
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${parseFloat(customer.total_spent || '0').toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center p-4 border-t gap-2 bg-muted/20">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={isFetching}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-md transition-colors ${
                        page === pageNum 
                          ? 'bg-primary text-primary-foreground font-medium' 
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isFetching}
                className="px-3 py-1 text-sm border rounded-md hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
