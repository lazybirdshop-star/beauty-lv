import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

export function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-20 text-center md:py-28">
      <Reveal>
        <h2 className="mb-4 text-3xl font-semibold tracking-tight text-ink text-balance md:text-4xl">
          Запускаемся с ограниченным числом мастеров
        </h2>
        <p className="mx-auto mb-8 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Каждый профиль подключаем вручную, чтобы сервис оставался быстрым и предсказуемым с
          первого дня.
        </p>
        <Button asChild size="default">
          <Link href="/register">Зарегистрироваться</Link>
        </Button>
      </Reveal>
    </section>
  );
}
