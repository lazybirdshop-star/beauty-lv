'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { createDashboardQueryClient } from '@/lib/dashboard-query-client';

/**
 * Mounted only inside the dashboard/admin layouts, not the root layout —
 * the public marketing/booking pages stay free of this client JS bundle
 * (see the dashboard-architecture plan §4).
 */
export function DashboardProviders({ children }: { children: ReactNode }) {
  /*
   * Переход жёсткий, а не `router.push`: истёкшая сессия обесценивает всё, что
   * лежит в памяти вкладки, — кэш запросов, черновики форм, открытые шторки.
   * Мягкий переход унёс бы это в следующую сессию. `replace`, потому что
   * «назад» с экрана входа вело бы в мёртвый кабинет.
   */
  const [queryClient] = useState(() =>
    createDashboardQueryClient((url) => window.location.replace(url)),
  );

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
