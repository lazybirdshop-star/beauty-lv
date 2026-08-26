import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import {
  Onest,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Golos_Text,
  Unbounded,
  Montserrat,
  Jost,
  Commissioner,
  Spectral,
  Playfair_Display,
  Inter,
  Cormorant,
  Cormorant_Garamond,
  Nunito,
} from 'next/font/google';

import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';

import './globals.css';

const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

/**
 * Предзагрузка выключена у всех гарнитур, кроме Onest.
 *
 * Каждое объявление `next/font` с предзагрузкой по умолчанию кладёт в `<head>`
 * ссылку на свои файлы — на **каждом** маршруте, где отрисован этот layout.
 * Гарнитуры ниже принадлежат мирам публичной страницы мастера и выбираются
 * ею по одной, но качались все сразу и везде: на лендинге это около полусотни
 * файлов впереди очереди, и фотография первого экрана приходила только на
 * седьмой секунде — телефон показывал чёрный экран, пока грузились шрифты,
 * которых на этой странице нет ни в одном элементе.
 *
 * Без предзагрузки объявление остаётся объявлением: браузер скачивает файл
 * тогда, когда его действительно требует элемент. Мир мастера получает свою
 * гарнитуру на кадр позже, под метрически подогнанной подменой от `next/font`
 * — цена, которую платит одна страница, вместо очереди, которую платили все.
 */
/*
 * Кириллица здесь не про кабинет, а про мир FUNK: там JetBrains Mono —
 * **текстовая** гарнитура, которой набрано всё, кроме заголовков. С одним
 * латинским сабсетом русские подписи страницы падали бы на системный
 * моноширинный, и мир терял бы свой голос ровно там, где он громче всего.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

/** Дисплейная гарнитура мира FUNK — плотный гротеск `brutal.html`. */
const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

/**
 * Display face, headlines only — Onest stays the UI/body font. The serif
 * is what carries the "premium beauty" register the product is aiming at;
 * using it below ~24px would just make the interface harder to read.
 */

/**
 * Selectable faces for a master's public page (shared-kernel `FONT_PRESETS`).
 * All are declared here, but the browser only fetches the file an element
 * actually references — six declarations are not six downloads.
 *
 * Every one carries a Cyrillic subset: the UI is Russian, and a fashionable
 * face without Cyrillic would hand the master a broken page. `next/font`
 * fails the build when a declared subset does not exist, so this is checked
 * rather than assumed.
 */
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const golos = Golos_Text({
  variable: '--font-golos',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const commissioner = Commissioner({
  variable: '--font-commissioner',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const spectral = Spectral({
  variable: '--font-spectral',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

/*
 * The four faces the soft world's catalogue referenced without loading, so
 * six of its eleven presets silently fell back to the system font
 * (audit P1-4). Luxury and the authored worlds draw from the same set.
 * Playfair Display, Inter, Cormorant and Nunito all carry Cyrillic and
 * latin-ext; the build fails if a declared subset does not exist.
 */
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const cormorant = Cormorant({
  variable: '--font-cormorant',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

/*
 * The face AURA's fifth pair names by name (`aura.html`). Cormorant and
 * Cormorant Garamond are two different cuts, and the world asks for the
 * Garamond one — reusing the plain Cormorant already declared above would
 * hand the master a pair she did not choose.
 *
 * AURA's fourth pair names Sora, which is not here and cannot be: Sora
 * ships `latin` and `latin-ext` only, so it cannot set a Russian page. Jost
 * — declared above, same geometric school — carries that slot instead; the
 * substitution is recorded in `theme-aura.ts`.
 */
const cormorantGaramond = Cormorant_Garamond({
  variable: '--font-cormorant-garamond',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
  preload: false,
});

export const metadata: Metadata = {
  title: 'AMOLIE',
  description: 'Онлайн-запись для мастеров индустрии красоты',
};

/**
 * Browser-chrome tint for the dashboard and marketing routes, which still run
 * the product defaults in globals.css — these two values are `--bg` light and
 * dark verbatim. The public master page overrides this per master in its own
 * segment: its ground is whichever palette she chose, and a single static
 * value could only ever be wrong there.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1015' },
  ],
};

/**
 * The direction contract for the public master page's visual world. Emitted
 * as a real HTML comment (see the body below) so it survives the production
 * build and can be audited from the built output.
 */
const DIRECTION_CONTRACT = `<!--
THESIS: the master's page is her own poster, not her row in a catalogue. It
refuses the template every booking product ships: cover photo, round avatar
overlapping it, star rating, service rows with prices right-aligned, a strip
of dates, a grid of time pills, a sticky button.

OWN-WORLD: Latvian poster school, 1970s-80s, where a poster was a sovereign
artwork rather than a notice. Ink-navy ground (#101A2E), paper type
(#F2EEE3), one vermilion (#E85A32) carrying both roles at 4.91:1 - a field
with dark type on it, and type on the ground. Flat fields and hard 1px
rules. No glass, no soft shadows, no pills, no rounded avatars.

STORY: a client arriving from Instagram at night learns that this master is
worth the trip and that a time exists which fits, in that order, and books
without writing a message.

FIRST VIEWPORT: the master's name set as poster type hard-left across the
full width, breaking across lines; the work photograph cropped by a colour
field rather than a frame; the nearest free window is the second-largest
thing on screen and is itself the action.

FORM: candidate 5 of the grounded list (Latvian poster school), assigned by
the roll over the appointment card, tool tray, swatch fan, enamel signage,
cosmetics carton and salon daybook; seed key 1c88927f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.
-->`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
   * Язык документа считается, а не задан константой.
   *
   * Здесь стояло `lang="ru"` — и это была не мелочь разметки. Лендинг
   * встречает незнакомого посетителя по-английски (`resolveMarketingLocale`
   * падает в `en`), а документ при этом объявлял себя русским: экранная
   * читалка озвучивала английский текст русским голосом, поисковик получал
   * английскую страницу под русским объявлением языка. Разъезжались не
   * переводы, а сам документ со своим содержимым.
   *
   * Источник тот же, что у страницы: явный выбор посетителя из куки, затем
   * `Accept-Language`. Кабинет поверх этого по-прежнему поправляет свой
   * поддерево сам (`I18nProvider`) — там язык берётся из `users.locale`, и
   * это знание приходит после входа, которого у корня нет.
   */
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const lang = resolveMarketingLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );

  return (
    <html
      lang={lang}
      /* next-themes writes data-theme on this element before React hydrates,
         and the panel's I18nProvider corrects `lang` for its own subtree —
         both are attribute changes the server could not have known about. */
      suppressHydrationWarning
      className={`${onest.variable} ${jetbrainsMono.variable} ${manrope.variable} ${golos.variable} ${unbounded.variable} ${montserrat.variable} ${jost.variable} ${commissioner.variable} ${spectral.variable} ${playfair.variable} ${inter.variable} ${cormorant.variable} ${cormorantGaramond.variable} ${nunito.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* A JSX comment is compiled away, so the direction contract ships as
            real markup instead: it has to survive the production build and be
            greppable in the built output, which is the whole point of writing
            it down. */}
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
