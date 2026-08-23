'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import {
  updateBookingAcceptance,
  updateCancellationPolicy,
} from '@/features/organization-profile/api';
import type { OrganizationProfile } from '@/features/organization-profile/types';
import { fmt, useT } from '@/lib/i18n';

/**
 * Сколько часов до визита клиент ещё может отменить сам.
 *
 * Список, а не поле ввода: мастер думает «за сутки», а не «за 24», и число,
 * набранное руками, рождает правила вроде «за 37 часов», которые ничего не
 * значат ни для кого. Крайние значения выбраны по смыслу: два часа — успеть
 * предупредить, трое суток — успеть продать время заново.
 */
const CANCELLATION_HOURS = [2, 12, 24, 72] as const;

/**
 * Подпись срока пишется словами и целиком, а не собирается из числа и слова
 * «часов»: «за сутки» — то, как об этом думает мастер, и ни в латышском, ни в
 * английском это не «24 чего-то».
 */
function deadlineLabel(hours: number, t: ReturnType<typeof useT>): string {
  if (hours <= 2) return t.bookings.clientCancelH2;
  if (hours <= 12) return t.bookings.clientCancelH12;
  if (hours <= 24) return t.bookings.clientCancelH24;
  return t.bookings.clientCancelH72;
}

/** По умолчанию, когда мастер только включает отмену: сутки — привычный срок отрасли. */
const DEFAULT_CANCELLATION_HOURS = 24;

/**
 * Два правила, по которым живёт запись: как она принимается и до какого
 * момента её может отменить клиент.
 *
 * Вместе, потому что мастер решает их за один заход — «сколько я хочу
 * контролировать» — и вместе же о них вспоминает. Внизу экрана намеренно:
 * правила меняют однажды, а список записей читают несколько раз в день.
 */
export function BookingRulesCard({
  slug,
  organization,
}: {
  slug: string;
  organization: OrganizationProfile;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
  const onError = () => toast({ message: t.common.actionFailed, tone: 'danger' });

  const acceptance = useMutation({
    mutationFn: (autoConfirm: boolean) => updateBookingAcceptance(slug, autoConfirm),
    onSuccess: invalidate,
    onError,
  });

  const cancellation = useMutation({
    mutationFn: (hours: number | null) => updateCancellationPolicy(slug, hours),
    onSuccess: invalidate,
    onError,
  });

  const cancellationHours = organization.clientCancellationHours;
  const cancellationOn = cancellationHours !== null;

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>{t.bookings.howToAccept}</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-2">
        <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{t.bookings.autoConfirm}</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              {organization.autoConfirmBookings
                ? t.bookings.autoConfirmOn
                : t.bookings.autoConfirmOff}
            </span>
          </span>
          <Switch
            checked={organization.autoConfirmBookings}
            disabled={acceptance.isPending}
            onCheckedChange={(checked) => acceptance.mutate(checked)}
            label={t.bookings.autoConfirm}
          />
        </label>

        <div className="flex flex-col gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <label className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {t.bookings.clientCancel}
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                {cancellationOn
                  ? fmt(t.bookings.clientCancelOn, {
                      deadline: deadlineLabel(cancellationHours, t),
                    })
                  : t.bookings.clientCancelOff}
              </span>
            </span>
            <Switch
              checked={cancellationOn}
              disabled={cancellation.isPending}
              onCheckedChange={(checked) =>
                cancellation.mutate(checked ? DEFAULT_CANCELLATION_HOURS : null)
              }
              label={t.bookings.clientCancel}
            />
          </label>

          {/* Срок появляется только когда отмена включена: выбор часов при
              выключенном правиле — вопрос ни о чём. */}
          {cancellationOn ? (
            <Select
              value={String(cancellationHours)}
              disabled={cancellation.isPending}
              aria-label={t.bookings.clientCancelDeadline}
              onChange={(event) => cancellation.mutate(Number(event.target.value))}
            >
              {CANCELLATION_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {deadlineLabel(hours, t)}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
