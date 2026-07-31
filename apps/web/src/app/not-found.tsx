import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Branded 404 for an unknown/suspended tenant subdomain
 * (see ARCHITECTURE.md §3.2) — not a generic framework error page.
 */
export default function OrgNotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
        Beauty.lv
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-ink text-balance">
        Такого мастера не нашлось
      </h1>
      <p className="max-w-xs text-sm text-ink-soft">
        Проверьте ссылку или адрес страницы. Возможно, мастер ещё не опубликовал профиль.
      </p>
      <Button asChild variant="secondary" className="mt-2">
        <Link href="/">На главную Beauty.lv</Link>
      </Button>
    </div>
  );
}
