import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { applyDraft, draftFromSearchParams } from '@/features/design-studio/draft';
import { getOrganizationBySlug, getPublishedSlots } from '@/features/public-profile/engine/data';
import { CalendarHost } from '@/features/public-profile/registry/calendar-host';
import { CompositionHost } from '@/features/public-profile/registry/composition-host';
import { I18nProvider } from '@/lib/i18n';

interface StudioPreviewProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
 * один документ не поделить — поэтому холст получает свой. Наружу изнутри не
 * поднимается ничего, кроме события «нажата зона», а страница о существовании
 * Студии не знает.
 *
 * Маршрут лежит вне группы `(public)` намеренно: та несёт свой layout, и
 * вложение дало бы два каркаса в одном документе. Сборка мира берётся из
 * `CompositionHost` — того же, что собирает публичную страницу, поэтому
 * расхождение предпросмотра со страницей исключено конструкцией, а не
 * сверкой.
 */
export default async function StudioPreviewPage({ params, searchParams }: StudioPreviewProps) {
  const { slug } = await params;
  const [org, rawParams] = await Promise.all([getOrganizationBySlug(slug), searchParams]);

  if (!org) {
    notFound();
  }

  /* Настоящие данные мастера, черновик — только поверх оформления. */
  const draftOrg = applyDraft(org, draftFromSearchParams(rawParams));
  const slots = await getPublishedSlots(slug);

  return (
    <I18nProvider locale={org.defaultLocale}>
      <CompositionHost org={draftOrg}>
        <CalendarHost org={draftOrg} initialSlots={slots} />
      </CompositionHost>
    </I18nProvider>
  );
}
