'use client';

/**
 * Уведомление о хранении в устройстве.
 *
 * Две формы в одном компоненте, и выбирает между ними опись, а не верстальщик.
 * Пока в устройстве лежит только строго необходимое, это **уведомление** с
 * одной кнопкой: согласия такие записи не требуют (ст. 5(3) Директивы
 * 2002/58/EC), и рисовать над ними «Принять / Отклонить» значило бы
 * изображать выбор, которого нет. Появится первая необязательная категория —
 * тот же компонент станет полосой согласия с равновесными «Принять всё» и
 * «Только необходимые».
 *
 * Показывать или нет, решает сервер (`needsDecision` в `page.tsx`): иначе
 * полоса мигала бы у каждого, кто уже ответил, — ровно та мелочь, по которой
 * страницу считают сделанной наспех.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  createConsent,
  serializeConsent,
} from '../consent';
import { optionalCategories, type StorageCategory } from '../storage-inventory';

/**
 * Запись куки из браузера, а не серверным действием.
 *
 * Кука согласия строго необходимая и не httpOnly: её читает и сервер, и этот
 * компонент. Серверное действие здесь означало бы круговой запрос и перерисовку
 * страницы ради того, чтобы убрать полосу, — заметную задержку на телефоне.
 */
function remember(granted: readonly StorageCategory[]): void {
  const value = serializeConsent(createConsent(granted));
  const attributes = `path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; samesite=lax${
    window.location.protocol === 'https:' ? '; secure' : ''
  }`;

  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; ${attributes}`;
}

/**
 * Полоса стоит поверх страницы и потому закрывает её нижний край — а внизу у
 * нас подвал с обязательными ссылками и строкой об обработчике данных.
 * Прятать их за уведомлением о хранении нельзя: это ровно те сведения, ради
 * которых уведомление и висит.
 *
 * Поэтому полоса сама сообщает странице свою высоту, а подвал добавляет её к
 * своему нижнему отступу. Замер, а не константа: высота зависит от языка (у
 * русского заголовка на телефоне две строки, у английского одна) и от того,
 * одна кнопка внизу или две.
 */
function useReservedSpace(enabled: boolean) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = panel.current;
    const root = document.documentElement;

    if (!enabled || !node) {
      root.style.removeProperty('--storage-notice-h');
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.borderBoxSize?.[0]?.blockSize ?? node.offsetHeight;
      root.style.setProperty('--storage-notice-h', `${Math.ceil(height) + 28}px`);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
      root.style.removeProperty('--storage-notice-h');
    };
  }, [enabled]);

  return panel;
}

export function StorageNotice({ t }: { t: Messages['legal'] }) {
  const [dismissed, setDismissed] = useState(false);
  const optional = optionalCategories();
  const needsConsent = optional.length > 0;
  const panel = useReservedSpace(!dismissed);

  if (dismissed) return null;

  const decide = (granted: readonly StorageCategory[]) => () => {
    remember(granted);
    setDismissed(true);
  };

  return (
    <aside className="storage-notice" role="region" aria-label={t.noticeAriaLabel}>
      <div className="storage-notice__panel" ref={panel}>
        <div className="storage-notice__copy">
          <p className="storage-notice__title">
            {needsConsent ? t.noticeConsentTitle : t.noticeTitle}
          </p>
          <p className="storage-notice__body">
            {needsConsent ? t.noticeConsentBody : t.noticeBody}{' '}
            <Link className="storage-notice__link" href="/cookies">
              {t.noticeMore}
            </Link>
          </p>
        </div>

        <div className="storage-notice__actions">
          {needsConsent ? (
            <>
              {/* Отказ такой же кнопкой, как согласие: разное оформление этих
                  двух — тёмный паттерн, за который штрафуют отдельно. */}
              <button type="button" className="storage-notice__btn" onClick={decide([])}>
                {t.noticeNecessaryOnly}
              </button>
              <button
                type="button"
                className="storage-notice__btn storage-notice__btn--solid"
                onClick={decide(optional)}
              >
                {t.noticeAcceptAll}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="storage-notice__btn storage-notice__btn--solid"
              onClick={decide([])}
            >
              {t.noticeAccept}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
