'use client';

import { CloudSlash } from '@phosphor-icons/react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * What a screen shows when its query failed — never the empty state. «Записей
 * пока нет» after a network drop reads as «мои записи пропали», the most
 * frightening sentence the product can say (audit P0). This banner tells the
 * truth and hands back a retry.
 */
export function LoadError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const t = useT();
  return (
    <Card
      role="alert"
      className={cn('flex flex-col items-center gap-3 py-10 text-center', className)}
    >
      <CloudSlash size={28} className="text-ink-faint" aria-hidden="true" />
      <p className="max-w-[36ch] text-sm text-ink-soft">{t.common.loadFailed}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {t.common.retry}
      </Button>
    </Card>
  );
}
