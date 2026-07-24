import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettingsStore } from '@/lib/store';

export function useOrderNotes(orderId: number | undefined) {
  const { storeUrl, consumerKey, consumerSecret } = useSettingsStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['order-notes', orderId],
    queryFn: async () => {
      if (!orderId || !storeUrl || !consumerKey || !consumerSecret) return [];
      
      const response = await fetch('/api/woo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `orders/${orderId}/notes`,
          method: 'GET',
          url: storeUrl,
          consumerKey,
          consumerSecret
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order notes');
      }

      return response.json();
    },
    enabled: !!orderId && !!storeUrl && !!consumerKey && !!consumerSecret,
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ note, isCustomerNote = false }: { note: string, isCustomerNote?: boolean }) => {
      const response = await fetch('/api/woo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `orders/${orderId}/notes`,
          method: 'POST',
          data: {
            note,
            customer_note: isCustomerNote,
          },
          url: storeUrl,
          consumerKey,
          consumerSecret
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add order note');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes', orderId] });
    },
  });

  return {
    notes: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addNote: addNoteMutation.mutate,
    isAddingNote: addNoteMutation.isPending,
  };
}
