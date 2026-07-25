import { useQuery } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';

const DEFAULT_STATUSES = [
  { value: 'any', label: 'All Orders' },
  { value: 'processing', label: 'Processing' },
  { value: 'pending', label: 'Pending' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
];

export function useOrderStatuses() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();

  return useQuery({
    queryKey: ['order-statuses', storeUrl],
    queryFn: async () => {
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return DEFAULT_STATUSES;
      }

      try {
        const response = await fetch('/api/woo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'reports/orders/totals',
            method: 'GET',
            url: storeUrl,
            consumerKey,
            consumerSecret
          })
        });

        if (!response.ok) {
          return DEFAULT_STATUSES;
        }

        const data = await response.json();
        
        // WooCommerce reports/orders/totals returns an array of objects:
        // [ { slug: "wc-pending", name: "Pending payment", total: 10 }, ... ]
        if (Array.isArray(data) && data.length > 0) {
          const dynamicStatuses = data.map((s: any) => ({
            value: s.slug.replace(/^wc-/, ''), // WooCommerce expects slug without 'wc-'
            label: s.name
          }));

          // Add 'any' at the top
          return [{ value: 'any', label: 'All Orders' }, ...dynamicStatuses];
        }

        return DEFAULT_STATUSES;
      } catch (e) {
        console.error('Failed to fetch dynamic order statuses', e);
        return DEFAULT_STATUSES;
      }
    },
    staleTime: Infinity, 
  });
}
