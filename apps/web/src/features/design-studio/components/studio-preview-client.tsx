'use client';

import type { PageDesign } from '@amolie/shared-kernel';
import { useEffect, useState } from 'react';

import type { PublicBooking } from '@/features/public-profile/engine/booking-status';
import type { PublicOrganization, PublishedSlot } from '@/features/public-profile/engine/types';
import { BookingStatusHost } from '@/features/public-profile/registry/booking-status-host';
import { CalendarHost } from '@/features/public-profile/registry/calendar-host';
import { CompositionHost } from '@/features/public-profile/registry/composition-host';

import {
  isStudioMessage,
  STUDIO_CHANNEL,
  zoneOfElement,
  type PreviewContext,
  type PreviewEmulation,
  type PreviewToStudio,
  type StudioToPreview,
} from '../preview-bridge';

/**
 * Холст Студии изнутри: та же страница, живущая на сообщениях (§4.1–4.3).
 *
 * **Мгновенность — требование, а не свойство** (§4.3). Первая версия холста
 * пересобирала адрес фрейма на каждую правку, то есть на каждое движение
 * ручки платила навигацией и двумя запросами к базе. Здесь фрейм грузится
 * один раз, а решения приезжают сообщением и меняют состояние React:
 * применение правки — один кадр, ничего не перезагружается и не
 * перезапрашивается. Медиа догружается по факту, как и на странице клиента.
 *
 * Сборка мира — тот же `CompositionHost`, что стоит на публичном маршруте:
 * предпросмотр не «похож на страницу», он ею и является.
 */
export function StudioPreviewClient({
  slug,
  org,
  initialSlots,
  initialDesign,
  fixtureBooking,
}: {
  slug: string;
  org: PublicOrganization;
  initialSlots: PublishedSlot[];
  initialDesign: PageDesign;
  /** Фикстура для контекста «страница статуса»: настоящей записи у холста нет. */
  fixtureBooking: PublicBooking;
}) {
  const [design, setDesign] = useState(initialDesign);
  const [context, setContext] = useState<PreviewContext>('page');
  const [emulation, setEmulation] = useState<PreviewEmulation>({
    reducedMotion: false,
    reducedTransparency: false,
  });

  useEffect(() => {
    function post(message: PreviewToStudio) {
      window.parent.postMessage(message, window.location.origin);
    }

    function onMessage(event: MessageEvent) {
      /* Только своё окно и только свой канал: холст открыт ссылкой, и
         сообщение из чужой вкладки не должно перекрашивать страницу. */
      if (event.origin !== window.location.origin) return;
      if (!isStudioMessage<StudioToPreview>(event.data)) return;

      switch (event.data.type) {
        case 'design':
          setDesign(event.data.design);
          break;
        case 'context':
          setContext(event.data.context);
          break;
        case 'emulate':
          setEmulation(event.data.emulation);
          break;
      }
    }

    /* Страница сама является картой своих настроек (§3.3): нажатие на зону
       открывает её секцию, а не совершает действие мира. Перехват на фазе
       захвата — чтобы кнопка не успела сработать до того, как Студия узнает
       о нажатии. */
    function onClick(event: MouseEvent) {
      const zone = zoneOfElement(event.target);
      if (!zone) return;
      event.preventDefault();
      event.stopPropagation();
      post({ channel: STUDIO_CHANNEL, type: 'zone', zone });
    }

    window.addEventListener('message', onMessage);
    document.addEventListener('click', onClick, true);
    post({ channel: STUDIO_CHANNEL, type: 'ready' });

    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  /* Эмуляция системных настроек посетителя: атрибуты на документе, которые
     globals.css читает наравне с медиазапросами. То, что продукт обещает в
     законах, в Студии можно потрогать глазами. */
  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-emulate-reduced-motion', emulation.reducedMotion);
    root.toggleAttribute('data-emulate-reduced-transparency', emulation.reducedTransparency);
  }, [emulation]);

  const previewOrg: PublicOrganization = { ...org, design };

  return (
    <CompositionHost org={previewOrg}>
      {context === 'status' ? (
        <BookingStatusHost
          slug={slug}
          org={previewOrg}
          booking={fixtureBooking}
          token="studio-preview"
        />
      ) : (
        <CalendarHost
          org={previewOrg}
          initialSlots={initialSlots}
          /* Шторка записи — главный экран страницы, и он обязан быть
             проверяемым (§4.2): мастер открывает его переключателем
             контекста, а не поиском кнопки на холсте. */
          sheetOpen={context === 'booking'}
        />
      )}
    </CompositionHost>
  );
}
