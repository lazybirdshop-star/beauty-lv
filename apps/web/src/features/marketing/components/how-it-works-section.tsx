import { BellRinging, CalendarPlus, HandTap } from '@phosphor-icons/react/dist/ssr';

import { Reveal } from '@/components/motion/reveal';

const STEPS = [
  {
    icon: CalendarPlus,
    title: 'Публикует окна',
    body: 'Мастер сама открывает время, когда готова принять клиента. Настраивать расписание не нужно.',
  },
  {
    icon: HandTap,
    title: 'Клиент бронирует',
    body: 'Видит только то, что опубликовано, и выбирает время в два тапа с телефона.',
  },
  {
    icon: BellRinging,
    title: 'Обе стороны спокойны',
    body: 'Напоминание за 2 часа до визита. Окно занято до отмены, двойных записей не бывает.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-bg-sunken/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="mb-10 max-w-md text-3xl font-semibold tracking-tight text-ink text-balance md:mb-14">
            Как это работает
          </h2>
        </Reveal>

        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1}>
              <div className="relative flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-accent-contrast">
                    {index + 1}
                  </span>
                  <step.icon size={22} className="text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="max-w-xs text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
