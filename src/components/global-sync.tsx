'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWooRest } from '@/lib/woo-rest-client';

export function GlobalSync() {
  const woo = useWooRest();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!woo) return;

    // Aggressively prefetch the first page of orders in the background 
    // as soon as credentials are provided, even if the user is on the Settings page.
    queryClient.prefetchQuery({
      queryKey: ['orders', 1, 50, 'processing', '', '', ''],
      queryFn: async () => {
        const res = await fetch('/api/orders?page=1&per_page=50&status=processing');
        if (!res.ok) throw new Error('Failed to prefetch orders');
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
    });
  }, [woo, queryClient]);

  return null; // This is a logic-only component
}
