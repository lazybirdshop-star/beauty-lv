import type { Metadata, Viewport } from 'next';
import {
  Onest,
  JetBrains_Mono,
  Playfair_Display,
  Manrope,
  Golos_Text,
  Unbounded,
  Cormorant_Garamond,
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
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin', 'cyrillic', 'latin-ext'],
});

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

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${onest.variable} ${jetbrainsMono.variable} ${playfair.variable} ${manrope.variable} ${golos.variable} ${unbounded.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
