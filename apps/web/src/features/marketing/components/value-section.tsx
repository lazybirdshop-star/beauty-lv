import { BellSimpleRinging, DeviceMobile, Globe } from '@phosphor-icons/react/dist/ssr';

import { Reveal } from '@/components/motion/reveal';

export function ValueSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <Reveal>
        <h2 className="mb-10 max-w-md text-3xl font-semibold tracking-tight text-ink text-balance md:mb-14">
          Сделано для телефона, а не переделано под него
        </h2>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-3">
        <Reveal className="md:col-span-2">
          <div className="flex h-full flex-col justify-between gap-8 rounded-[20px] bg-gradient-to-br from-accent to-[color-mix(in_srgb,var(--accent)_78%,black)] p-7 text-accent-contrast">
            <DeviceMobile size={28} weight="light" />
            <div>
              <h3 className="mb-2 text-xl font-semibold">Работает как приложение</h3>
              <p className="max-w-md text-[15px] leading-relaxed text-accent-contrast/90">
                PWA без App Store: открывается мгновенно, ставится на домашний экран и остаётся
                быстрым даже на слабом интернете.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4">
          <Reveal delay={0.1}>
            <div className="rounded-[20px] border border-border bg-bg-raised p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                <BellSimpleRinging size={20} className="text-accent" />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-ink">SMS-напоминания</h3>
              <p className="text-sm leading-relaxed text-ink-soft">
                За 2 часа до визита: меньше неявок без лишних звонков.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="rounded-[20px] border border-border bg-bg-raised p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                <Globe size={20} className="text-accent" />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-ink">LV · RU · EN</h3>
              <p className="text-sm leading-relaxed text-ink-soft">
                Интерфейс говорит на языке клиента, а не только вашем.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
