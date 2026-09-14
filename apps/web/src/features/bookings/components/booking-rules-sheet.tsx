'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Sheet } from '@/components/ui/sheet';
import { SwitchRow } from '@/components/ui/switch-row';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import {
  updateBookingAcceptance,
  updateCancellationPolicy,
} from '@/features/organization-profile/api';
import type { OrganizationProfile } from '@/features/organization-profile/types';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

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
 * контролировать» — и вместе же о них вспоминает. Тело правил одно на два
 * места: вкладка «Запись» в разделе «Страница» (спецификация дашборда §47) —
 * там, где мастер настраивает, что видит клиент, — и шторка на экране
 * записей, в одном нажатии от работы.
 */
export function BookingRules({
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
  const onError = (error: unknown) =>
    toast({ message: describeApiError(error, t), tone: 'danger' });

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

  /* Строки прототипа «Кабинет 2026» (`.switch-row`), а не плашки: правило —
     подпись, живое пояснение того, как сейчас, и тумблер. */
  return (
    <div className="rules-list">
      <SwitchRow
        label={t.bookings.autoConfirm}
        hint={
          organization.autoConfirmBookings ? t.bookings.autoConfirmOn : t.bookings.autoConfirmOff
        }
        checked={organization.autoConfirmBookings}
        disabled={acceptance.isPending}
        onChange={(checked) => acceptance.mutate(checked)}
      />

      <SwitchRow
        label={t.bookings.clientCancel}
        hint={
          cancellationOn
            ? fmt(t.bookings.clientCancelOn, { deadline: deadlineLabel(cancellationHours, t) })
            : t.bookings.clientCancelOff
        }
        checked={cancellationOn}
        disabled={cancellation.isPending}
        onChange={(checked) => cancellation.mutate(checked ? DEFAULT_CANCELLATION_HOURS : null)}
      >
        {/* Срок появляется только когда отмена включена: выбор часов при
            выключенном правиле — вопрос ни о чём. Сегментом, как в
            прототипе: четыре варианта видны сразу, без раскрытия списка. */}
        {cancellationOn ? (
          <span className="seg-pills" role="group" aria-label={t.bookings.clientCancelDeadline}>
            {CANCELLATION_HOURS.map((hours) => (
              <button
                key={hours}
                type="button"
                aria-pressed={hours === cancellationHours}
                disabled={cancellation.isPending}
                onClick={() => {
                  if (hours !== cancellationHours) cancellation.mutate(hours);
                }}
              >
                {deadlineLabel(hours, t)}
              </button>
            ))}
          </span>
        ) : null}
      </SwitchRow>
    </div>
  );
}

/**
 * Шторка, а не карточка внизу экрана записей. Правила меняют однажды, а
 * список записей читают несколько раз в день, и наверх их поднимать нельзя, —
 * но под сорока карточками «внизу экрана» значит «нигде». Кнопка в строке
 * действий держит и то и другое: работа по-прежнему первая, а правила в одном
 * нажатии.
 */
export function BookingRulesSheet({
  open,
  onOpenChange,
  slug,
  organization,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  organization: OrganizationProfile;
}) {
  const t = useT();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.howToAccept}
      description={t.bookings.rulesHint}
    >
      <BookingRules slug={slug} organization={organization} />
    </Sheet>
  );
}
