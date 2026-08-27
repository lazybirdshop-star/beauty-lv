'use client';

import Link from 'next/link';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Подпись платформы в подвале страницы мастера.
 *
 * Язык — язык **страницы**: его выбирает мастер (`defaultLocale`), и `useT`
 * на публичных страницах уже разрешён в него, а не в язык браузера читателя.
 * Клиент из Риги, открывший латышскую страницу с русским телефоном, читает
 * подвал по-латышски — как и всё остальное на ней.
 *
 * Ссылка относительная: страница мастера живёт по `amolie.com/{адрес}`, то
 * есть на том же origin, что и лендинг, и `/` — это он. Абсолютный адрес
 * пришлось бы держать в синхроне с доменом, а он у продукта один.
 *
 * Разметка общая, вид — нет: каждый мир зовёт это своим набором классов.
 * Подвал, набранный в одном шрифте на шести разных мирах, читался бы как
 * чужая наклейка на всех, кроме одного, — а это подпись автора страницы, и
 * ей полагается говорить голосом страницы.
 */
export function MadeOnAmolie({ className }: { className?: string }) {
  const t = useT();

  return (
    <footer className={cn('shrink-0', className)}>
      <Link
        href="/"
        /* Не `target="_blank"`: посетитель ушёл со страницы мастера по своей
           воле, и оставлять за собой вкладку, которую он не открывал, —
           решение за него. */
        className="press inline-block rounded-full transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {t.publicPage.madeOn}
      </Link>
    </footer>
  );
}
