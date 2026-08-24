'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { AdminOrganization, OrganizationStatus } from '../types';

/**
 * Три состояния салона — с последствиями, названными вслух.
 *
 * Подпись под каждым обязательна: «приостановлен» и «в архиве» отличаются не
 * правами (обе закрывают витрину), а намерением — первое ждёт ответа мастера,
 * второе не ждёт. Без объяснения выбор между ними был бы гаданием.
 */
function statusOptions(t: Messages): { value: OrganizationStatus; label: string; hint: string }[] {
  return [
    { value: 'active', label: t.admin.orgStatusActive, hint: t.admin.orgStatusActiveHint },
    { value: 'suspended', label: t.admin.orgStatusSuspended, hint: t.admin.orgStatusSuspendedHint },
    { value: 'archived', label: t.admin.orgStatusArchived, hint: t.admin.orgStatusArchivedHint },
  ];
}

interface OrganizationStatusSheetProps {
  organization: AdminOrganization | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: OrganizationStatus) => void;
  submitting: boolean;
}

export function OrganizationStatusSheet({
  organization,
  onOpenChange,
  onConfirm,
  submitting,
}: OrganizationStatusSheetProps) {
  const t = useT();
  const [selected, setSelected] = useState<OrganizationStatus | null>(null);

  if (!organization) return null;
  const current = selected ?? organization.status;

  return (
    <Sheet
      open={Boolean(organization)}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
        onOpenChange(open);
      }}
      title={t.admin.changeOrgStatus}
      description={organization.name}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {statusOptions(t).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={current === option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                'cursor-pointer rounded-xl border px-4 py-3 text-left',
                current === option.value
                  ? 'border-accent bg-accent-soft'
                  : 'border-border hover:bg-bg-sunken',
              )}
            >
              <span className="block text-[15px] font-semibold text-ink">{option.label}</span>
              <span className="mt-0.5 block text-sm text-ink-soft">{option.hint}</span>
            </button>
          ))}
        </div>
        <Button
          disabled={submitting || current === organization.status}
          onClick={() => onConfirm(current)}
          className="w-full"
        >
          {submitting ? t.common.saving : t.admin.saveStatus}
        </Button>
      </div>
    </Sheet>
  );
}
