'use client';

import type { PageDesign } from '@amolie/shared-kernel';
import { useId, useMemo, useSyncExternalStore } from 'react';

import { ScopedThemeStyle } from '../shared/theme-style';

import { resolveBrandStyleKey } from './brand-style';
import { CompositionRoot } from './brand-style-registry';
import { CalendarHost } from './calendar-host';
import { useComposition } from './composition-context';
import { buildFixtureOrganization, buildFixtureSlots } from './world-preview-fixtures';

/** Ширина, на которой мир рисуется, до масштабирования: телефонный кадр. */
const CANVAS_WIDTH = 390;

/* Канонический признак «гидратация прошла»: серверный снимок — `false`,
   клиентский — `true`. Через `useSyncExternalStore`, а не через setState в
   эффекте: тот вызывает каскадный рендер, и React справедливо на это ругается.
   Подписка пустая — значение меняется ровно один раз, при гидратации. */
const subscribeToNothing = () => () => {};
const useIsHydrated = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

/**
 * Сокращённый разворот мира: его собственные `Header` и `CalendarSection`,
 * взятые из того же реестра, что обслуживает публичную страницу.
 *
 * Слоты берутся из контекста композиции, а календарь монтируется штатным
 * `CalendarHost` — тем самым хостом, что стоит на маршруте. Второй реализации
 * предпросмотра не существует: каталог не «рисует похожее», он рендерит мир.
 */
function ThumbnailBody({
  org,
  slots,
}: {
  org: ReturnType<typeof buildFixtureOrganization>;
  slots: ReturnType<typeof buildFixtureSlots>;
}) {
  const { Header } = useComposition();
  return (
    <>
      <Header org={org} />
      <CalendarHost org={org} initialSlots={slots} />
    </>
  );
}

/**
 * Живая миниатюра мира для каталога оформления (M8, п.1).
 *
 * Три решения, каждое обязательное:
 *
 * 1. **Токены — в атрибутный селектор, не в `:root`.** Кабинет владеет
 *    `:root` и держит там свою тему; мир, написавший туда, перекрасил бы
 *    кабинет вокруг себя. `ScopedThemeStyle` ограничивает мир его коробкой.
 * 2. **Монтаж только на клиенте.** Фикстурные окна отсчитываются от
 *    сегодняшнего дня, а сервер и браузер могут стоять по разные стороны
 *    полуночи — при SSR это давало бы расхождение гидратации. Заодно чанки
 *    миров не попадают в серверную выдачу кабинета.
 * 3. **Мир нерабочий и невидим для ассистивных технологий.** Это образец, а
 *    не вторая копия страницы: `inert` снимает и фокус, и нажатия, а
 *    `aria-hidden` убирает дубль содержимого из читалки — выбор делает
 *    кнопка каталога, внутри которой миниатюра лежит.
 */
export function WorldThumbnail({
  design,
  height = 232,
}: {
  /** Решения, которыми мир показывается: те же, что уедут на страницу. */
  design: PageDesign;
  /** Высота видимого окна миниатюры; ширина берётся от контейнера. */
  height?: number;
}) {
  const scopeId = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const mounted = useIsHydrated();

  const styleKey = resolveBrandStyleKey(design.style);
  const org = useMemo(() => buildFixtureOrganization(design), [design]);
  /* Один отсчёт на монтирование: пересборка слотов на каждый рендер сбрасывала
     бы внутреннее состояние календаря. */
  const slots = useMemo(() => (mounted ? buildFixtureSlots(new Date()) : []), [mounted]);

  return (
    <div
      data-world-scope={scopeId}
      aria-hidden
      className="relative overflow-hidden rounded-xl border border-border bg-bg-sunken"
      style={{ height }}
    >
      <ScopedThemeStyle scopeId={scopeId} design={design} />
      {mounted ? (
        <div
          /* React 19 знает `inert` как булев проп и сам ставит атрибут.
             Пустая строка, которую этот вызов передавал раньше, читается
             платформой как `false` — и мир внутри миниатюры оставался
             фокусируемым и нажимаемым вопреки замыслу. */
          inert
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            /* Кадр телефона вписывается в ширину карточки каталога. Масштаб
               задаётся переменной, которую ставит контейнер, — миниатюра не
               измеряет себя сама и не держит ResizeObserver. */
            transform: 'scale(var(--thumb-scale, 0.62))',
            background: 'var(--bg)',
            fontFamily: 'var(--font-page-sans)',
            /* Высота с запасом: обрезает overflow контейнера, а не миниатюра. */
            minHeight: height / 0.62,
          }}
        >
          <CompositionRoot styleKey={styleKey}>
            <ThumbnailBody org={org} slots={slots} />
          </CompositionRoot>
        </div>
      ) : (
        /* Честный скелетон до монтирования — не спиннер и не пустая рамка. */
        <div className="h-full w-full animate-pulse bg-bg-sunken" />
      )}
    </div>
  );
}
