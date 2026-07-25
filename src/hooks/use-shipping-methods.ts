import { useQuery } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';

export interface ShippingMethodOption {
  id: string;
  title: string;
  description?: string;
}

const DEFAULT_SHIPPING_METHODS: ShippingMethodOption[] = [
  { id: 'flat_rate', title: 'Flat Rate' },
  { id: 'free_shipping', title: 'Free Shipping' },
  { id: 'local_pickup', title: 'Local Pickup' },
];

export function useShippingMethods() {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();

  return useQuery({
    queryKey: ['shipping-methods', storeUrl],
    queryFn: async () => {
      if (!storeUrl || !consumerKey || !consumerSecret) {
        return DEFAULT_SHIPPING_METHODS;
      }

      try {
        const response = await fetch('/api/woo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'shipping_methods',
            method: 'GET',
            url: storeUrl,
            consumerKey,
            consumerSecret
          })
        });

        if (!response.ok) {
          return DEFAULT_SHIPPING_METHODS;
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          return data.map((method: any) => ({
            id: method.id,
            title: method.title || method.name || method.id,
            description: method.description || ''
          }));
        }

        return DEFAULT_SHIPPING_METHODS;
      } catch (e) {
        console.error('Failed to fetch dynamic shipping methods', e);
        return DEFAULT_SHIPPING_METHODS;
      }
    },
    staleTime: 1000 * 60 * 15,
  });
}
