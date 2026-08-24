'use client';

import { Eye } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

/**
 * Полоса «вы в чужом кабинете» — на каждом экране, пока длится режим поддержки.
 *
 * Не тихая пометка в углу и не всплывающее уведомление: человек, работающий
 * за чужим столом, должен видеть это постоянно. Цена забытой вкладки —
 * действие от имени мастера, которое ей же и придётся объяснять клиенту.
 */
export function SupportModeBanner({ masterName }: { masterName: string }) {
  const t = useT();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function leave(): Promise<void> {
    setLeaving(true);
    try {
      const response = await fetch('/api/admin/impersonate/stop', { method: 'POST' });
      const data = (await response.json().catch(() => ({}))) as { redirectUrl?: string };
      router.push(data.redirectUrl ?? '/admin');
      router.refresh();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-warning px-5 py-2.5 text-[15px] text-ink"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Eye size={18} weight="fill" className="shrink-0" aria-hidden="true" />
        <span className="truncate">{fmt(t.admin.supportModeBanner, { name: masterName })}</span>
      </span>
      <button
        type="button"
        onClick={() => void leave()}
        disabled={leaving}
        className="shrink-0 cursor-pointer rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-bg disabled:opacity-60"
      >
        {t.admin.supportModeLeave}
      </button>
    </div>
  );
}
