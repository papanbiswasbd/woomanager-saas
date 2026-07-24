import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: ['order-statuses'],
    queryFn: async () => {
      // Return default WooCommerce statuses.
      // Custom statuses are dynamically appended on the UI side from actual loaded orders.
      return DEFAULT_STATUSES;
    },
    staleTime: Infinity, 
  });
}
