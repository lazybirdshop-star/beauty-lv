'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/toast';

/**
 * Mounted only inside the dashboard/admin layouts, not the root layout —
 * the public marketing/booking pages stay free of this client JS bundle
 * (see the dashboard-architecture plan §4).
 */
export function DashboardProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
