import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StudioPreviewClient } from '@/features/design-studio/components/studio-preview-client';
import type { PublicBooking } from '@/features/public-profile/engine/booking-status';
import { getOrganizationBySlug, getPublishedSlots } from '@/features/public-profile/engine/data';
import { I18nProvider } from '@/lib/i18n';

interface StudioPreviewProps {
  params: Promise<{ slug: string }>;
}

/**
 * Холст никогда не индексируется: это черновик, а не витрина. Роботам он
 * закрыт явно, а не оставлен на усмотрение.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Изолированный маршрут предпросмотра — документ, который Студия показывает
 * во фрейме (DESIGN_STUDIO.md §4.2).
 *
 * Почему отдельный документ, а не блок внутри кабинета. Страница пишет токены
 * в `:root` (закон `ThemeStyle`: шторка записи уходит в портал и живёт вне
 * поддерева), и кабинет держит на том же `:root` собственную тему. Двум темам
 * один документ не поделить — поэтому холст получает свой.
 *
 * Сервер отдаёт настоящие данные мастера и опубликованный облик; черновик
 * приезжает сообщением от Студии и живёт в состоянии клиента (§4.3). В адресе
 * решений нет намеренно: холст открыт ссылкой, и оформление, приходящее
 * параметрами, означало бы страницу, облик которой задаёт кто угодно.
 *
 * Маршрут лежит вне группы `(public)` намеренно: та несёт свой layout, и
 * вложение дало бы два каркаса в одном документе.
 */
export default async function StudioPreviewPage({ params }: StudioPreviewProps) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  if (!org) {
    notFound();
  }

  const slots = await getPublishedSlots(slug, org.timeZone);

  /* Контекст «страница статуса» (§4.4) — экран, который клиент получает после
     записи. Настоящей записи у холста нет и быть не должно: запись в
     предпросмотре не совершается, поэтому статус показывается на фикстуре с
     ближайшим опубликованным окном. */
  const first = org.services[0];
  const fixtureBooking: PublicBooking = {
    status: 'pending',
    startsAt: slots[0]?.iso ?? new Date().toISOString(),
    /* Отмены на холсте нет: предпросмотр показывает облик, а не действия. */
    cancellableUntil: null,
    durationMinutes: first?.durationMinutes ?? 60,
    items: first
      ? [
          {
            name: first.name,
            durationMinutes: first.durationMinutes,
            priceAmountMinorUnits: first.priceAmountMinorUnits,
            priceCurrency: first.priceCurrency,
          },
        ]
      : [],
  };

  return (
    <I18nProvider locale={org.defaultLocale}>
      <StudioPreviewClient
        slug={slug}
        org={org}
        initialSlots={slots}
        initialDesign={org.design}
        fixtureBooking={fixtureBooking}
      />
    </I18nProvider>
  );
}
