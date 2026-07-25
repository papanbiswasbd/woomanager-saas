'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import * as import_react from 'react';
import { useOrders } from '@/hooks/use-orders';
import { useOrderStatuses } from '@/hooks/use-order-statuses';
import { useSettingsStore } from '@/lib/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Search, Loader2, Eye, Printer, Tag, Plus, MoreHorizontal, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { OrderDetailsDrawer } from '@/components/orders/order-details-drawer';
import { CreateOrderDialog } from '@/components/orders/create-order-dialog';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DateFilter } from '@/components/date-filter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { printOrderInvoice } from '@/lib/print-invoice';
import { printOrderLabel } from '@/lib/print-label';
import { downloadOrderInvoicePDF } from '@/lib/download-invoice';
import { downloadOrderLabelPNG } from '@/lib/download-label';

const OrderTableRow = import_react.memo(({ order, onSelect, isSelected, onToggleSelect }: { order: any; onSelect: (id: number) => void; isSelected: boolean; onToggleSelect: (id: number) => void }) => {
  return (
    <tr 
      onClick={() => onSelect(order.id)}
      className={`transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'}`}
    >
      <td className="px-6 py-4 w-12" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          className="rounded border-gray-300 dark:border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          checked={isSelected}
          onChange={(e) => {
            onToggleSelect(order.id);
          }}
        />
      </td>
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
          ${order.status === 'order-confirmed' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' : ''}
          ${order.status === 'ready' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : ''}
          ${order.status === 'no-response' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : ''}
          ${order.status === 'waiting' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''}
          ${!['completed', 'processing', 'cancelled', 'failed', 'pending', 'on-hold', 'refunded', 'order-confirmed', 'ready', 'no-response', 'waiting'].includes(order.status) ? 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-muted-foreground' : ''}
        `}>
          {order.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right font-medium">
        <span dangerouslySetInnerHTML={{ __html: order.currency_symbol }} />
        {order.total}
      </td>
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onSelect(order.id)}
            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center border border-input shadow-xs hover:border-primary/50"
            title="View Order Details"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View Details</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center border border-input shadow-xs hover:border-primary/50"
              title="More Actions"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem 
                onClick={() => printOrderInvoice(order)}
                className="cursor-pointer flex items-center gap-2"
              >
                <Printer className="h-4 w-4 text-muted-foreground" />
                <span>Print Invoice</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => printOrderLabel(order)}
                className="cursor-pointer flex items-center gap-2"
              >
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span>Print 58mm Label</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadOrderInvoicePDF(order)}
                className="cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Download Invoice (PDF)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => downloadOrderLabelPNG(order)}
                className="cursor-pointer flex items-center gap-2"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Download Label (PNG)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}, (prev, next) => prev.order === next.order && prev.onSelect === next.onSelect && prev.isSelected === next.isSelected && prev.onToggleSelect === next.onToggleSelect);

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
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  
  const handleSelectOrder = import_react.useCallback((id: number) => {
    setSelectedOrderId(id);
  }, []);
  
  const handleToggleSelect = import_react.useCallback((id: number) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(new Set(orders.map((o: any) => o.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const [page, setPage] = useState(1);
  const perPage = 50;
  
  const { data, isLoading, error, isFetching } = useOrders(page, perPage, status, searchParam, from, to);
  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 0;
  const statusCounts = data?.statusCounts || {};
  const { data: baseStatuses = [] } = useOrderStatuses();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [page, status, searchInput]);

  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '', currentId: null as number | null });

  const processBulkUpdate = async (newStatus: string, ids: number[]) => {
    setIsBulkUpdating(true);
    setBulkProgress({ current: 0, total: ids.length, status: newStatus, currentId: null });
    
    setSelectedOrderIds(new Set());
    
    // Process all requests concurrently for maximum speed
    await Promise.all(ids.map(async (id) => {
      try {
        const response = await fetch('/api/woo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: `orders/${id}`,
            method: 'PUT',
            data: { status: newStatus },
            url: storeUrl,
            consumerKey,
            consumerSecret
          })
        });
        
        if (response.ok) {
          queryClient.setQueriesData({ queryKey: ['orders'] }, (old: any) => {
            if (!old || !old.orders) return old;
            return {
              ...old,
              orders: old.orders.map((o: any) => o.id === id ? { ...o, status: newStatus } : o)
            };
          });
        }
      } catch (err) {
        console.error(`Failed to update order ${id}`, err);
      }
      
      // Update progress as each concurrent request finishes
      setBulkProgress(prev => ({ ...prev, current: prev.current + 1, currentId: id }));
    }));
    
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setTimeout(() => {
      setIsBulkUpdating(false);
    }, 600);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    if (!newStatus || selectedOrderIds.size === 0) return;
    if (confirm(`Change status of ${selectedOrderIds.size} orders to "${newStatus}"?`)) {
      processBulkUpdate(newStatus, Array.from(selectedOrderIds));
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
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
          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {allStatuses
          .filter((s: any) => s.value === 'any' || s.value === status || (statusCounts[s.value] || 0) > 0)
          .map((s: any) => {
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
                  {selectedOrderIds.size > 0 ? (
                    <tr>
                      <th className="px-6 py-3 font-medium w-12">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          checked={selectedOrderIds.size === orders.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th colSpan={7} className="px-6 py-2">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-primary">{selectedOrderIds.size} selected</span>
                          <select 
                            className="h-8 text-xs border rounded px-2 bg-background focus:ring-1 focus:ring-primary focus:outline-none capitalize"
                            value=""
                            onChange={(e) => handleBulkStatusChange(e.target.value)}
                            disabled={isBulkUpdating}
                          >
                            <option value="" disabled>Change Status...</option>
                            {baseStatuses.filter((s: any) => s.value !== 'any').map((s: any) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          {isBulkUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>
                      </th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-6 py-3 font-medium w-12">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-3 font-medium">Order</th>
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Address</th>
                      <th className="px-6 py-3 font-medium">Products</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Total</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y">
                  {orders.map((order: any) => (
                    <OrderTableRow 
                      key={order.id} 
                      order={order} 
                      onSelect={handleSelectOrder} 
                      isSelected={selectedOrderIds.has(order.id)}
                      onToggleSelect={handleToggleSelect}
                    />
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

      <CreateOrderDialog
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
      />

      <Dialog open={isBulkUpdating} onOpenChange={(open) => !open && setIsBulkUpdating(false)}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Updating Orders</DialogTitle>
            <DialogDescription>
              Please wait while we update {bulkProgress.total} {bulkProgress.total === 1 ? 'order' : 'orders'} to <span className="font-semibold text-foreground capitalize">{bulkProgress.status.replace(/-/g, ' ')}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Progress value={bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0} className="h-2 w-full mb-4" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {bulkProgress.currentId ? `Processing order #${orders.find((o: any) => o.id === bulkProgress.currentId)?.number || bulkProgress.currentId}...` : "Starting..."}
              </span>
              <span className="font-medium">
                {bulkProgress.current} / {bulkProgress.total}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
