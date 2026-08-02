import type { Metadata, Viewport } from 'next';
import { Onest, JetBrains_Mono, Playfair_Display } from 'next/font/google';
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
      className={`${onest.variable} ${jetbrainsMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
