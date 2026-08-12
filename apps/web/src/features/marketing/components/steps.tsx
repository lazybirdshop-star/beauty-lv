import type { Messages } from '@/lib/i18n/messages';

/**
 * Пять шагов — проводка страницы.
 *
 * Нумерация здесь не украшение: она обещает конец. Посетитель, увидевший 01
 * из 05, знает объём того, во что вникает, и дочитывает — приём взят из
 * закреплённого референса и работает ровно этим.
 *
 * Каждый шаг — правда о механизме, а не польза общими словами: продукт
 * действительно не имеет шаблона рабочих часов, действительно считает
 * длительность по услугам и действительно не умеет присылать уведомления,
 * поэтому напоминание названо тем, чем является, — календарём телефона.
 */
export function Steps({ t }: { t: Messages['marketing'] }) {
  const steps = [
    { title: t.step1Title, body: t.step1Body },
    { title: t.step2Title, body: t.step2Body },
    { title: t.step3Title, body: t.step3Body },
    { title: t.step4Title, body: t.step4Body },
    { title: t.step5Title, body: t.step5Body },
  ];

  return (
    <section id="steps" className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-32">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--lp-ink-faint)]">
        {t.stepsTitle}
      </h2>

      <ol className="mt-12 md:mt-16">
        {steps.map((step, index) => (
          <li key={step.title} className="lp-rise">
            {/* Линейка приходит росчерком слева направо, а не проявлением:
                она черта, и ведёт себя как черта. */}
            <div className="lp-rule lp-draw h-px" />
            <div className="grid gap-4 py-9 md:grid-cols-[auto_1fr_1.15fr] md:gap-12 md:py-12">
              <span className="text-[13px] font-medium tabular-nums text-[var(--lp-accent)] md:pt-1.5">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-balance md:text-[27px]">
                {step.title}
              </h3>
              <p className="lp-measure text-[16px] leading-[1.65] text-[var(--lp-ink-soft)] md:pt-1">
                {step.body}
              </p>
            </div>
          </li>
        ))}
        <li aria-hidden="true" className="lp-rule lp-draw h-px" />
      </ol>
    </section>
  );
}
