'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Последний рубеж: падение самого корневого layout.
 *
 * Заменяет собой документ целиком — отсюда собственные `<html>` и `<body>`.
 * По той же причине оформление здесь **строчными стилями, а не классами**:
 * до этого экрана доходят ровно в том случае, когда сломалось всё, включая
 * возможную загрузку таблицы стилей. Класс, который не к чему применить,
 * выдал бы человеку белый лист с чёрным шрифтом Times — то есть страницу,
 * выглядящую сломаннее, чем есть.
 *
 * Текст по-русски и без словаря: контекста языка на этом уровне уже нет, а
 * `useT` требует провайдера, которого не существует, если упал корень. Тот же
 * выбор, что и у `not-found.tsx`.
 *
 * Цвета — светлая палитра из `globals.css`, вписанная числами. Тёмную тему
 * здесь не различаем: экран показывается доли секунды и раз в жизни.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    /* Ради этого файл и существует. Падение корня — единственная ошибка,
       которую не видит ни Vercel (страница не отрисовалась), ни граница
       ошибок сегмента (её тоже снесло). */
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          background: '#fdf6f8',
          color: '#271620',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#a63a5f',
          }}
        >
          AMOLIE
        </span>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Что-то сломалось
        </h1>
        <p style={{ margin: 0, maxWidth: '32ch', fontSize: 14, color: '#6e4652' }}>
          Мы уже знаем об этом. Попробуйте обновить страницу.
        </p>
        {/* Именно <a>, а не next/link: глобальная ошибка рендерится вместо
            корневого layout — роутер в этот момент считается сломанным, и
            уводить отсюда нужно полной перезагрузкой страницы. Правило
            отключено на весь файл в его шапке: построчное отключение здесь
            не живёт — форматтер схлопывает JSX-комментарий в пустое
            выражение, и запрет пропадал молча. */}
        <a
          href="/"
          style={{
            marginTop: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#a63a5f',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          На главную
        </a>
      </body>
    </html>
  );
}
