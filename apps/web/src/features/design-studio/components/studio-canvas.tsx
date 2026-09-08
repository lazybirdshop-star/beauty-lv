'use client';

import type { MediaDecision, PageDesign } from '@amolie/shared-kernel';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import {
  isStudioMessage,
  PREVIEW_CONTEXTS,
  STUDIO_CHANNEL,
  type PreviewContext,
  type PreviewEmulation,
  type PreviewToStudio,
  type StudioToPreview,
  type StudioZone,
} from '../preview-bridge';

export type StudioDevice = 'phone' | 'desktop';

/** Телефон и десктоп — два края шкалы; планшета нет намеренно (§4.4). */
const DEVICE_WIDTH: Record<StudioDevice, number> = { phone: 390, desktop: 1440 };
const DEVICE_HEIGHT: Record<StudioDevice, number> = { phone: 780, desktop: 900 };

/**
 * Живой холст Студии: публичная страница мастера во фрейме.
 *
 * Фрейм, а не блок — по §4.2: страница пишет токены в `:root`, кабинет
 * держит там свою тему, и делить один документ им нельзя.
 *
 * **Правка применяется за один кадр** (§4.3). Адрес фрейма собирается один
 * раз; всё остальное приезжает сообщением и меняет состояние React внутри
 * предпросмотра. Прежняя версия пересобирала адрес на каждое движение ручки,
 * то есть платила навигацией и двумя запросами к базе за каждый выбор цвета,
 * — тянущийся предпросмотр убивает главное свойство Студии и является
 * дефектом, а не медленной фичей.
 */
export function StudioCanvas({
  slug,
  design,
  avatar,
  device,
  context,
  emulation,
  onZone,
}: {
  slug: string;
  design: PageDesign;
  /** Портрет мастера — не решение макета, но холст обязан его показывать. */
  avatar: MediaDecision | null;
  device: StudioDevice;
  context: PreviewContext;
  emulation: PreviewEmulation;
  /** Нажатие на зону страницы открывает её секцию в инспекторе (§3.3). */
  onZone: (zone: StudioZone) => void;
}) {
  const t = useT();
  const frame = useRef<HTMLIFrameElement | null>(null);
  const shell = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);

  const post = useCallback((message: StudioToPreview) => {
    frame.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  /* Приём сообщений снизу: готовность и нажатая зона — всё, что предпросмотр
     поднимает наружу. */
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isStudioMessage<PreviewToStudio>(event.data)) return;
      if (event.data.type === 'ready') setReady(true);
      if (event.data.type === 'zone') onZone(event.data.zone);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onZone]);

  /* Состояние холста — проекция состояния Студии: каждое изменение уезжает
     вниз тем же путём, и расходиться им негде. */
  useEffect(() => {
    if (ready) post({ channel: STUDIO_CHANNEL, type: 'design', design, avatar });
  }, [avatar, design, post, ready]);

  useEffect(() => {
    if (ready) post({ channel: STUDIO_CHANNEL, type: 'context', context });
  }, [context, post, ready]);

  useEffect(() => {
    if (ready) post({ channel: STUDIO_CHANNEL, type: 'emulate', emulation });
  }, [emulation, post, ready]);

  /* Кадр устройства рисуется в натуральную ширину и ужимается трансформом:
     масштаб меняет размер, но не раскладку — 1440px внутри фрейма остаются
     1440px, и мастер видит те брейкпоинты, которые получит клиент.
     Масштаб считается по месту, а не задан константой: на ноутбуке и на
     внешнем мониторе места разное. */
  useEffect(() => {
    const box = shell.current;
    if (!box) return;
    const measure = () => {
      /* Поля читаются у самого холста, а не задаются числом: на телефоне их
         нет вовсе — страница показывается во всю ширину, как в артборде
         `StudioMobile.dc.html`, — и постоянная поправка в 32px ужимала бы
         кадр там, где ужимать нечего. */
      const styles = getComputedStyle(box);
      const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const available = box.clientWidth - padX;
      const availableHeight = box.clientHeight - padY;

      /*
       * На телефоне кадр меряется только по ширине.
       *
       * Высота устройства (844px) в отведённые под предпросмотр шестьсот с
       * небольшим не влезает никогда, и подгонка по ней ужимала кадр до трёх
       * четвертей ширины экрана: страница показывалась в окошке посреди
       * телефона. В артборде `StudioMobile.dc.html` она занимает экран
       * целиком и прокручивается внутри — так же, как у клиента.
       */
      const fitHeight = box.clientWidth >= 900;
      setScale(
        Math.min(
          1,
          available / DEVICE_WIDTH[device],
          fitHeight ? availableHeight / DEVICE_HEIGHT[device] : Infinity,
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [device]);

  return (
    <div
      ref={shell}
      className="studio-canvas flex h-full w-full items-start justify-center overflow-auto p-4"
    >
      <div
        /* Кадр устройства — рамка кабинета, а не картинка телефона: в системе
           скругление либо 999px, либо 0, а глубину несёт волосяная линия, не
           тень. Круглые «плечи» рисовали телефон вокруг страницы, которую
           клиент увидит во весь экран. */
        className="studio-canvas__device origin-top overflow-hidden border border-border bg-bg-raised"
        style={{
          width: DEVICE_WIDTH[device],
          height: DEVICE_HEIGHT[device],
          transform: `scale(${scale})`,
          /* Место под кадром — ужатое, а не натуральное: иначе холст
             прокручивался бы в пустоту под масштабированным телефоном. */
          marginBottom: DEVICE_HEIGHT[device] * (scale - 1),
        }}
      >
        <iframe
          ref={frame}
          src={`/${slug}/studio-preview`}
          title={t.studio.canvasTitle}
          className={cn(
            'h-full w-full border-0 transition-opacity duration-[var(--dur-reveal)]',
            ready ? 'opacity-100' : 'opacity-0',
          )}
          /*
           * Тот же origin — фрейму нужен доступ к своим стилям и шрифтам, а
           * Студии нужен канал сообщений. Формы внутри холста работают:
           * шторка записи обязана проходить шаги, иначе главный экран
           * страницы непроверяем (§4.2).
           */
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  );
}

export { PREVIEW_CONTEXTS };
