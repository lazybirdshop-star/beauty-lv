'use client';

import type { PageDesign } from '@amolie/shared-kernel';
import { useCallback, useId, useMemo, useState, useSyncExternalStore } from 'react';

import type { PublicOrganization } from '../engine/types';
import { ScopedThemeStyle } from '../shared/theme-style';

import { resolveBrandStyleKey } from './brand-style';
import { CompositionRoot } from './brand-style-registry';
import { CalendarHost } from './calendar-host';
import { useComposition } from './composition-context';
import { useThumbnailSource } from './thumbnail-source';
import { buildFixtureOrganization, buildFixtureSlots } from './world-preview-fixtures';

/** Ширина, на которой мир рисуется, до масштабирования: телефонный кадр. */
const CANVAS_WIDTH = 390;
/** Масштаб кадра в широкой коробке каталога — прежний, 0.62. */
const DEFAULT_SCALE = 0.62;

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
  source,
}: {
  /** Решения, которыми мир показывается: те же, что уедут на страницу. */
  design: PageDesign;
  /**
   * Настоящая страница мастера вместо фикстуры каталога.
   *
   * Каталог сравнивает миры на одной вымышленной мастерской. Но там, где
   * миниатюра показывает облик **своей** страницы («Страница → Оформление»),
   * чужое имя с чужой услугой читалось как не её страница.
   */
  source?: PublicOrganization;
  /** Высота видимого окна миниатюры; ширина берётся от контейнера. */
  height?: number;
}) {
  const scopeId = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const mounted = useIsHydrated();

  const styleKey = resolveBrandStyleKey(design.style);
  const contextSource = useThumbnailSource();
  const own = source ?? contextSource;
  const org = useMemo(
    () => (own ? { ...own, design } : buildFixtureOrganization(design)),
    [design, own],
  );
  /* Один отсчёт на монтирование: пересборка слотов на каждый рендер сбрасывала
     бы внутреннее состояние календаря. */
  const slots = useMemo(() => (mounted ? buildFixtureSlots(new Date()) : []), [mounted]);

  /*
   * Масштаб — по ширине своей коробки.
   *
   * Постоянные 0.62 давали кадр в 242 px, и в коробках уже него («Страница →
   * Оформление», шаг знакомства на телефоне) миниатюра резалась справа
   * посреди слова: «UMEN STUDIO», «ПОД ОДНО». Коробка меряется один раз и при
   * смене её ширины; каталог с широкими карточками получает ровно тот же
   * кадр, что и раньше, а узкая коробка — уменьшенный целиком.
   */
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const fit = () =>
      setScale(Math.min(DEFAULT_SCALE, node.clientWidth / CANVAS_WIDTH) || DEFAULT_SCALE);
    fit();
    /* Среды без наблюдателя (тесты) остаются на первом замере. */
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={measure}
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
            /* Кадр телефона вписывается в ширину своей коробки. */
            transform: `scale(${scale})`,
            background: 'var(--bg)',
            fontFamily: 'var(--font-page-sans)',
            /* Высота с запасом: обрезает overflow контейнера, а не миниатюра. */
            minHeight: height / scale,
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
