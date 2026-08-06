'use client';

import { HourglassMedium } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';
import { Card } from '@/components/ui/card';

/** Used by every `ready: false` nav route (see nav-config.ts) until its module ships. */
export function ComingSoonScreen({ title, description }: { title: string; description?: string }) {
  const t = useT();
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <HourglassMedium size={32} className="text-ink-faint" />
      <div>
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">
          {description ?? t.nav.comingSoon}
        </p>
      </div>
    </Card>
  );
}
