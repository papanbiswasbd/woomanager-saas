'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function RealtimeListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') return;

          console.log("⚡ Realtime update received from WooCommerce:", data);

          if (data.resource === 'order') {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          } else if (data.resource === 'product') {
            queryClient.invalidateQueries({ queryKey: ['products'] });
          } else if (data.resource === 'customer') {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          }
        } catch (e) {}
      };

      eventSource.onerror = () => {
        // Automatically reconnects
      };
    } catch (e) {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);

  return null;
}
