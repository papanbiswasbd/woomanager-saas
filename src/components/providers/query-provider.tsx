'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Keep data fresh in memory indefinitely so page switches & reloads are instant
            gcTime: 1000 * 60 * 60 * 24, // 24 hours cache retention
            refetchOnWindowFocus: false, // Don't trigger refetch on window focus
            refetchOnMount: false, // Don't trigger refetch on component mount if cached
            refetchOnReconnect: false, // Don't refetch on network reconnect
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
