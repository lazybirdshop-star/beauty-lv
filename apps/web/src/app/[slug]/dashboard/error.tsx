'use client';

import { CloudSlash } from '@phosphor-icons/react';
import { useEffect } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Segment-level error boundary for the whole dashboard: a server fetch that
 * throws no longer takes the shell down or, worse, renders nothing. The
 * shell and navigation stay; only the screen's content is replaced by the
 * truth and a retry.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // Surfaced for observability; the digest is what Vercel/Next logs key on.
    console.error(error);
  }, [error]);

  return (
    <Card role="alert" className="flex flex-col items-center gap-3 py-14 text-center">
      <CloudSlash size={32} className="text-ink-faint" aria-hidden="true" />
      <h2 className="font-display text-[22px] text-ink">{t.common.errorTitle}</h2>
      <p className="max-w-[38ch] text-sm text-ink-soft">{t.common.loadFailed}</p>
      <Button size="sm" variant="secondary" onClick={reset}>
        {t.common.retry}
      </Button>
    </Card>
  );
}
