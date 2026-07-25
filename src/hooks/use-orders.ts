import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';

export function useOrders(page = 1, perPage = 50, status = 'any', search = '', from = '', to = '') {
  // We still check if the store is configured before fetching, to avoid errors
  const { storeUrl } = useSettingsStore();

  return useQuery({
    queryKey: ['orders', page, perPage, status, search, from, to],
    queryFn: async () => {
      let url = `/api/orders?page=${page}&per_page=${perPage}&status=${status}&search=${encodeURIComponent(search)}`;
      if (from && to) {
        url += `&from=${from}&to=${to}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch orders from local database');
      return res.json();
    },
    enabled: !!storeUrl, 
    staleTime: 1000 * 60 * 5, 
    placeholderData: keepPreviousData,
  });
}
