'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/store';
import { useProducts } from '@/hooks/use-products';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export default function ProductsPage() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, totalPages: 0, totalSynced: 0 });
  const [page, setPage] = useState(1);
  const perPage = 50;

  const { data, isLoading, error, isFetching } = useProducts(page, perPage);
  const products = data?.products || [];
  const totalPages = data?.totalPages || 0;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress({ current: 0, totalPages: 0, totalSynced: 0 });
    let syncPage = 1;
    let hasMore = true;
    let totalSynced = 0;

    try {
      while (hasMore) {
        const res = await fetch('/api/sync/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: storeUrl, consumerKey, consumerSecret, page: syncPage })
        });
        const syncData = await res.json();
        
        if (!res.ok) {
          throw new Error(syncData.message || 'Failed to sync products');
        }

        totalSynced += syncData.count;
        hasMore = syncData.hasMore;
        setSyncProgress({ current: syncPage, totalPages: syncData.totalPages, totalSynced });
        syncPage++;
      }
      alert(`Successfully synced ${totalSynced} products to local database!`);
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, totalPages: 0, totalSynced: 0 });
    }
  };

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
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {isSyncing ? 'Syncing...' : 'Sync Products'}
        </button>
      </div>

      {isSyncing && syncProgress.totalPages > 0 && (
        <div className="bg-card border rounded-lg p-4 shadow-sm space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Syncing Products...</span>
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

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm relative">
        {isFetching && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="animate-pulse font-medium text-primary bg-background/80 px-4 py-2 rounded-full shadow-sm">Loading...</div>
          </div>
        )}
        
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">
            Loading products from WooCommerce...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            Failed to fetch products: {error.message}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No products found. Sync your store to load products.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium w-16">Image</th>
                    <th className="px-6 py-3 font-medium">Product Name</th>
                    <th className="px-6 py-3 font-medium">SKU</th>
                    <th className="px-6 py-3 font-medium">Stock</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product: any) => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0].src} alt={product.name} className="h-10 w-10 object-cover rounded border bg-white" />
                        ) : (
                          <div className="h-10 w-10 border bg-muted flex items-center justify-center rounded">
                            <span className="text-xs text-muted-foreground">No img</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{product.name}</div>
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">{product.categories?.map((c: any) => c.name).join(', ')}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {product.sku || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-xs font-medium ${product.stock_status === 'instock' ? 'text-green-600' : 'text-red-600'}`}>
                          {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                        </div>
                        {product.manage_stock && product.stock_quantity !== null && (
                          <div className="text-xs text-muted-foreground">({product.stock_quantity})</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {product.price ? `$${product.price}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
                          ${product.status === 'publish' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'}
                        `}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {product.permalink && (
                          <a 
                            href={product.permalink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Preview Product"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
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
    </div>
  );
}
