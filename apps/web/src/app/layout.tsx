import type { Metadata, Viewport } from 'next';
import {
  Onest,
  JetBrains_Mono,
  Manrope,
  Golos_Text,
  Unbounded,
  Montserrat,
  Jost,
  Commissioner,
  Spectral,
} from 'next/font/google';
import './globals.css';

const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
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
});

const golos = Golos_Text({
  variable: '--font-golos',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

const jost = Jost({ variable: '--font-jost', subsets: ['latin', 'cyrillic', 'latin-ext'] });

const commissioner = Commissioner({
  variable: '--font-commissioner',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

const spectral = Spectral({
  variable: '--font-spectral',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

export const metadata: Metadata = {
  title: 'Beauty.lv',
  description: 'Онлайн-запись для мастеров индустрии красоты',
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${onest.variable} ${jetbrainsMono.variable} ${manrope.variable} ${golos.variable} ${unbounded.variable} ${montserrat.variable} ${jost.variable} ${commissioner.variable} ${spectral.variable} h-full antialiased`}
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
