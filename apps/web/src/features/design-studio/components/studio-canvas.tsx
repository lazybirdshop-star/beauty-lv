'use client';

import { useMemo } from 'react';

import { draftToSearchParams, type StudioDraft } from '../draft';

export type StudioDevice = 'phone' | 'desktop';

/** Телефон и десктоп — два края шкалы; планшета нет намеренно (§4.4). */
const DEVICE_WIDTH: Record<StudioDevice, number> = {
  phone: 390,
  desktop: 1440,
};

/**
 * Живой холст Студии: публичная страница мастера во фрейме.
 *
 * Фрейм, а не блок — по §4.2: страница пишет токены в `:root`, кабинет держит
 * там свою тему, и делить один документ им нельзя. Внутри фрейма работает
 * маршрут `/[slug]/studio-preview`, собирающий мир тем же `CompositionHost`,
 * что и публичная страница, — предпросмотр не «похож на страницу», он ею и
 * является.
 *
 * Десктопный кадр шире любого разумного контейнера кабинета, поэтому он
 * рисуется в натуральную ширину и ужимается трансформом: масштаб меняет
 * размер, но не раскладку — 1440px внутри фрейма остаются 1440px, и мастер
 * видит именно те брейкпоинты, которые получит клиент.
 */
export function StudioCanvas({
  slug,
  draft,
  device,
  title,
}: {
  slug: string;
  draft: StudioDraft;
  device: StudioDevice;
  title: string;
}) {
  /*
   * Адрес пересобирается только при смене черновика. Пока меняются цвет,
   * палитра или пара гарнитур, фрейм не перезагружается — те же значения
   * приезжают токенами; перезагрузка остаётся ценой медийных ручек, где
   * меняется само содержимое (§4.3).
   */
  const src = useMemo(() => {
    const params = draftToSearchParams(draft);
    return `/${slug}/studio-preview?${params.toString()}`;
  }, [slug, draft]);

  const width = DEVICE_WIDTH[device];

  return (
    <div className="flex h-full w-full items-start justify-center overflow-auto p-4">
      <div
        className="origin-top overflow-hidden rounded-[28px] border border-border bg-bg-raised shadow-soft"
        style={{
          width,
          /* Телефон помещается как есть; десктоп ужимается по месту. */
          height: device === 'phone' ? 780 : 900,
          transform: device === 'desktop' ? 'scale(var(--canvas-scale, 0.52))' : undefined,
        }}
      >
        <iframe
          key={device}
          src={src}
          title={title}
          className="h-full w-full border-0"
          /*
           * Тот же origin — фрейму нужен доступ к своим стилям и шрифтам, а
           * Студии со временем понадобится событие «нажата зона» (§3.3).
           * Формы внутри холста работают: шторка записи обязана проходить
           * шаги, иначе главный экран страницы непроверяем (§4.2).
           */
          sandbox="allow-same-origin allow-scripts allow-forms"
          loading="lazy"
        />
      </div>
    </div>
  );
}
