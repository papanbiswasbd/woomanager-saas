'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import * as import_react from 'react';
import { useOrders } from '@/hooks/use-orders';
import { useOrderStatuses } from '@/hooks/use-order-statuses';
import { useSettingsStore } from '@/lib/store';
import { Package, Search } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { OrderDetailsDrawer } from '@/components/orders/order-details-drawer';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DateFilter } from '@/components/date-filter';

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const status = searchParams.get('status') || 'processing';
  const searchParam = searchParams.get('search') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const [searchInput, setSearchInput] = useState(searchParam);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 50;
  
  const { data, isLoading, error, isFetching } = useOrders(page, perPage, status, searchParam, from, to);
  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 0;
  const statusCounts = data?.statusCounts || {};
  const { data: baseStatuses = [] } = useOrderStatuses();

  // Reset page when status changes
  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', newStatus);
    setPage(1);
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const currentUrlSearch = params.get('search') || '';
      if (searchInput.trim() !== currentUrlSearch) {
        if (searchInput.trim()) {
          params.set('search', searchInput.trim());
        } else {
          params.delete('search');
        }
        setPage(1);
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, searchParams, pathname, router]);

  // Dynamically extract any custom statuses from the currently loaded orders
  // just in case they weren't caught by the GraphQL introspection
  const allStatuses = useMemo(() => {
    if (!orders || orders.length === 0) return baseStatuses;
    
    const existingValues = new Set(baseStatuses.map((s: any) => s.value));
    const orderStatuses = orders.map((o: any) => o.status);
    const uniqueStatuses = Array.from(new Set(orderStatuses));
    
    const newStatuses = uniqueStatuses
      .filter((s: any) => !existingValues.has(s))
      .map((s: any) => ({
        value: s,
        label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '),
      }));
      
    return [...baseStatuses, ...newStatuses];
  }, [orders, baseStatuses]);

  // Generate pagination buttons
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button key="1" onClick={() => setPage(1)} className="h-8 w-8 rounded-md text-sm font-medium transition-colors hover:bg-muted">1</button>
      );
      if (startPage > 2) pages.push(<span key="ellipsis-start" className="px-2 text-muted-foreground">...</span>);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
            page === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<span key="ellipsis-end" className="px-2 text-muted-foreground">...</span>);
      pages.push(
        <button key={totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 rounded-md text-sm font-medium transition-colors hover:bg-muted">
          {totalPages}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-center space-x-2 p-4 border-t bg-muted/10">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isFetching}
          className="h-8 px-3 rounded-md text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          Previous
        </button>
        {pages}
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || isFetching}
          className="h-8 px-3 rounded-md text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
          <DateFilter defaultPreset="all" />
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search orders..."
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {allStatuses.map((s: any) => {
          const count = statusCounts[s.value] || 0;
          return (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                status === s.value 
                  ? 'bg-primary text-primary-foreground shadow' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {s.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status === s.value ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm relative">
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="animate-pulse font-medium text-primary bg-background/80 px-4 py-2 rounded-full shadow-sm">Loading...</div>
          </div>
        )}
        
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">
            Loading orders from WooCommerce...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            Failed to fetch orders: {error.message}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No orders found matching your filter.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Address</th>
                    <th className="px-6 py-3 font-medium">Products</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order: any) => (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrderId(order.id)}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">#{order.number}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(order.date_created), 'MMM d, h:mm a')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.billing.first_name} {order.billing.last_name}
                        <div className="text-xs text-muted-foreground">{order.billing.phone}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="truncate" title={order.shipping?.address_1 || order.billing?.address_1}>
                          {order.shipping?.address_1 || order.billing?.address_1 || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[order.shipping?.city || order.billing?.city, order.shipping?.state || order.billing?.state].filter(Boolean).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[250px]">
                        <div className="flex gap-3 items-center flex-wrap pt-1">
                          {order.line_items?.slice(0, 4).map((item: any) => (
                            <div key={item.id} className="relative group" title={item.name}>
                              {item.image?.src ? (
                                <img src={item.image.src} alt={item.name} className="w-9 h-9 rounded-md object-cover border bg-white shadow-sm" />
                              ) : (
                                <div className="w-9 h-9 rounded-md border shadow-sm bg-gray-50 dark:bg-muted flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm z-10">
                                {item.quantity}
                              </span>
                            </div>
                          ))}
                          {order.line_items?.length > 4 && (
                            <div className="w-9 h-9 rounded-md border shadow-sm bg-gray-50 dark:bg-muted/50 flex items-center justify-center text-xs text-muted-foreground font-medium">
                              +{order.line_items.length - 4}
                            </div>
                          )}
                          {!order.line_items?.length && <span className="text-muted-foreground text-xs">No items</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
                          ${order.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                          ${order.status === 'processing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}
                          ${order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ''}
                          ${order.status === 'pending' || order.status === 'on-hold' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : ''}
                          ${order.status === 'refunded' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400' : ''}
                        `}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />
                        {order.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {renderPagination()}
          </div>
        )}
      </div>

      <OrderDetailsDrawer 
        order={orders.find((o: any) => o.id === selectedOrderId) || null} 
        isOpen={!!selectedOrderId} 
        onClose={() => setSelectedOrderId(null)} 
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading orders...</div>}>
      <OrdersPageContent />
    </Suspense>
  );
}
