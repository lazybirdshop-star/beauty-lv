import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { ProductMockup } from './product-mockup';

export function HeroSection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 md:grid-cols-2 md:gap-8 md:pb-24 md:pt-20">
      <div className="flex flex-col items-start gap-5 text-left">
        <h1 className="max-w-md text-4xl font-semibold leading-[1.08] tracking-tight text-ink text-balance md:text-5xl">
          Запись, которая не требует объяснений
        </h1>
        <p className="max-w-sm text-[17px] leading-relaxed text-ink-soft">
          Мастер публикует свободные окна, клиент бронирует в два тапа. Никаких звонков,
          ежедневников и путаницы в сообщениях.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button asChild size="default">
            <Link href="/register">Зарегистрироваться</Link>
          </Button>
          <Button asChild variant="secondary" size="default">
            <Link href="#how-it-works">Как это работает</Link>
          </Button>
        </div>
      </div>

      <div className="order-first md:order-last">
        <ProductMockup />
      </div>
    </section>
  );
}
