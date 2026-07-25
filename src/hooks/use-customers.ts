import { useQuery } from '@tanstack/react-query';

export function useCustomers({ page = 1, perPage = 20 }: { page?: number; perPage?: number }) {
  return useQuery({
    queryKey: ['customers', page, perPage],
    queryFn: async () => {
      const res = await fetch(`/api/customers?page=${page}&per_page=${perPage}`);
      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
