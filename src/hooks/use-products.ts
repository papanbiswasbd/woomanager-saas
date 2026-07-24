import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';

export function useProducts(page = 1, perPage = 50) {
  const { storeUrl } = useSettingsStore();

  return useQuery({
    queryKey: ['products', page, perPage],
    queryFn: async () => {
      const res = await fetch(`/api/products?page=${page}&per_page=${perPage}`);
      if (!res.ok) throw new Error('Failed to fetch products from local database');
      return res.json();
    },
    enabled: !!storeUrl, 
    staleTime: 1000 * 60 * 5, 
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
  });
}
