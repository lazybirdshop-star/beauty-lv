'use client';

import { useState } from 'react';

import { useT, type Messages } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import type { AdminUser, SystemRole } from '../types';

function roleOptions(t: Messages): { value: SystemRole; label: string }[] {
  return [
    { value: 'client', label: t.admin.roleClient },
    { value: 'master', label: t.admin.roleMaster },
    { value: 'platform_admin', label: t.admin.rolePlatformAdmin },
  ];
}

interface RoleChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onConfirm: (role: SystemRole) => void;
  submitting: boolean;
}

export function RoleChangeSheet({
  open,
  onOpenChange,
  user,
  onConfirm,
  submitting,
}: RoleChangeSheetProps) {
  const t = useT();
  const [selected, setSelected] = useState<SystemRole | null>(null);

  if (!user) return null;
  const current = selected ?? user.systemRole;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.admin.changeRole}
      description={user.fullName}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {roleOptions(t).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={current === option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-[15px] font-semibold',
                current === option.value
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button
          disabled={submitting || current === user.systemRole}
          onClick={() => onConfirm(current)}
          className="w-full"
        >
          {submitting ? t.common.saving : t.admin.saveRole}
        </Button>
      </div>
    </Sheet>
  );
}
