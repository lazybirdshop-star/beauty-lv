'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import type { AdminUser, SystemRole } from '../types';

const ROLE_OPTIONS: { value: SystemRole; label: string }[] = [
  { value: 'client', label: 'Клиент' },
  { value: 'master', label: 'Мастер' },
  { value: 'platform_admin', label: 'Администратор платформы' },
];

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
  const [selected, setSelected] = useState<SystemRole | null>(null);

  if (!user) return null;
  const current = selected ?? user.systemRole;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Изменить роль"
      description={user.fullName}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={current === option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-[15px] font-semibold',
                current === option.value
                  ? 'border-accent bg-accent-soft text-accent'
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
          {submitting ? 'Сохраняем…' : 'Сохранить роль'}
        </Button>
      </div>
    </Sheet>
  );
}
