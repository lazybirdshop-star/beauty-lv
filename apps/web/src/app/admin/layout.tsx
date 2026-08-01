import type { ReactNode } from 'react';

import { DashboardProviders } from '@/app/providers';
import { DashboardShell } from '@/features/dashboard-shell/components/dashboard-shell';

/**
 * Coarse role gate already happened in middleware.ts (edge, JWT-only).
 * Nothing here re-checks the role — that would be exactly the "проверять
 * роли внутри компонентов" the spec forbids.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProviders>
      <DashboardShell nav={{ role: 'admin' }} panelLabel="Админ-панель">
        {children}
      </DashboardShell>
    </DashboardProviders>
  );
}
