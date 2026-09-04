'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { setPlatformSwitch } from '../api';
import type { PlatformSwitches } from '../types';

type SwitchKey = keyof PlatformSwitches;

/**
 * Опасная зона — по артборду `AdminSettings.dc.html`.
 *
 * Два выключателя, каждый из которых останавливает продукт целиком, и оба
 * сохраняются в момент переключения: настройка, останавливающая запись на всей
 * платформе, не должна ждать, пока человек долистает до «Сохранить».
 *
 * Именно поэтому включение спрашивает подтверждение, а выключение — нет:
 * первое отнимает работу у всех сразу, второе её возвращает. Вопрос там, где
 * ошибка дорогая, и только там: лишний вопрос учит не читать вопросы.
 */
export function DangerZoneCard({ values }: { values: PlatformSwitches }) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<SwitchKey | null>(null);

  const mutation = useMutation({
    mutationFn: ({ key, on }: { key: SwitchKey; on: boolean }) => setPlatformSwitch(key, on),
    onSuccess: () => {
      setConfirming(null);
      void queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ message: t.admin.saved });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const rows: { key: SwitchKey; label: string; hint: string }[] = [
    {
      key: 'maintenance_mode',
      label: t.admin.maintenanceMode,
      hint: t.admin.maintenanceHint,
    },
    {
      key: 'bookings_paused',
      label: t.admin.bookingsPaused,
      hint: t.admin.bookingsPausedHint,
    },
  ];

  const prompts: Record<SwitchKey, { title: string; body: string }> = {
    maintenance_mode: {
      title: t.admin.maintenanceConfirm,
      body: t.admin.maintenanceConfirmBody,
    },
    bookings_paused: {
      title: t.admin.bookingsPausedConfirm,
      body: t.admin.bookingsPausedConfirmBody,
    },
  };

  return (
    <section className="danger-zone">
      <div className="row" style={{ gap: 8, marginBottom: 6, color: 'var(--red)' }}>
        <Icon name="alert" className="ico-18" />
        <span className="t-section" style={{ fontSize: 15, color: 'var(--ink)' }}>
          {t.admin.sectionDanger}
        </span>
        <span className="t-meta" style={{ marginLeft: 'auto', fontSize: 12 }}>
          {t.admin.eachAsksConfirm}
        </span>
      </div>

      {rows.map((row) => (
        <div className="settings-row" key={row.key}>
          <div className="col" style={{ minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--red)' }}>{row.label}</span>
            <span className="t-meta" style={{ fontSize: 12.5 }}>
              {row.hint}
            </span>
          </div>
          <Switch
            on={values[row.key]}
            label={row.label}
            disabled={mutation.isPending}
            onChange={(next) =>
              next ? setConfirming(row.key) : mutation.mutate({ key: row.key, on: false })
            }
          />
        </div>
      ))}

      <ConfirmSheet
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? prompts[confirming].title : ''}
        description={confirming ? prompts[confirming].body : ''}
        confirmLabel={t.admin.turnOn}
        loading={mutation.isPending}
        onConfirm={() => confirming && mutation.mutate({ key: confirming, on: true })}
      />
    </section>
  );
}

/**
 * Тумблер из набора.
 *
 * Кнопкой с `role="switch"`, а не флажком: в макете это тумблер, и человек
 * ждёт от него нажатия. Состояние озвучивается `aria-checked`, подпись
 * приходит из строки, к которой он относится.
 */
export function Switch({
  on,
  label,
  onChange,
  disabled,
}: {
  on: boolean;
  label: string;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={on ? 'switch is-on' : 'switch'}
      onClick={() => onChange(!on)}
    />
  );
}

/** Подпись «сохраняется сразу» / «нужно нажать Сохранить» в шапке раздела. */
export function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
      <span className="t-section" style={{ fontSize: 15 }}>
        {title}
      </span>
      <span className="t-meta" style={{ fontSize: 12 }}>
        {note}
      </span>
    </div>
  );
}
