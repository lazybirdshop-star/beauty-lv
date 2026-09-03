'use client';

/**
 * Правая половина порога.
 *
 * Снимок и строка разные у входа и у регистрации, и это не украшение: у входа
 * человек возвращается к своему делу — за стеклом салон и «день уже
 * набирается»; на регистрации он ещё ничего не завёл, и кадр показывает то,
 * ради чего заводят, — клиентку, которая записывается с телефона.
 *
 * Клиентский компонент, потому что разделяет их адрес, а `layout.tsx` его не
 * знает: `headers()` в Next отдаёт заголовки запроса, а не маршрут, и
 * прокидывать адрес через каждую из шести страниц значило бы шесть раз
 * повторить одно решение.
 */
import type { Messages } from '@/lib/i18n/messages';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';

import { Still } from './still';

export function AuthVisual({ t }: { t: Messages['marketing'] }) {
  const pathname = usePathname();
  const registering = pathname?.startsWith('/register') ?? false;

  const scene = registering
    ? {
        src: '/landing/booking-window.jpg',
        /* Кадр вертикальный: без смещения вверх в половину попадает подоконник,
           а не лицо. */
        position: '50% 30%',
        eyebrow: t.showcaseEyebrow,
        line: t.heroTitle,
        accent: t.heroTitleAccent,
      }
    : {
        src: '/landing/cover-salon.jpg',
        position: '60% 50%',
        eyebrow: t.heroEyebrow,
        line: t.authVisualLoginLine,
        accent: t.authVisualLoginAccent,
      };

  return (
    <aside
      className="auth__visual"
      aria-hidden="true"
      style={{ '--pos': scene.position } as CSSProperties}
    >
      <Still src={scene.src} sizes="(max-width: 900px) 0px, 50vw" />
      <div className="auth__caption">
        <p className="eyebrow">{scene.eyebrow}</p>
        <p>
          {scene.line} <em>{scene.accent}</em>
        </p>
      </div>
    </aside>
  );
}
