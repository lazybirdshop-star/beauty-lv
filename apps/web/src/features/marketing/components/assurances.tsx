import type { Messages } from '@/lib/i18n/messages';

/**
 * Три обещания, которые продукт может доказать сегодня.
 *
 * Тёмная полоса посреди светлой страницы — единственная смена земли на всём
 * лендинге, и стоит она там, где меняется разговор: от «как это работает» к
 * «почему этому можно доверить свой календарь». Плотность здесь выше, чем в
 * шагах, и следующая за ней секция снова тихая — так дышит вся страница.
 *
 * Все три пункта проверяемы: гарантию занятости даёт уникальный индекс в
 * базе, три языка и два независимых выбора существуют, база и хостинг — в ЕС.
 * Ни уведомлений, ни оплат, ни числа мастеров здесь нет, потому что их нет.
 */
export function Assurances({ t }: { t: Messages['marketing'] }) {
  const items = [
    { title: t.proofTitle, body: t.proofBody },
    { title: t.languagesTitle, body: t.languagesBody },
    { title: t.dataTitle, body: t.dataBody },
  ];

  return (
    <section className="bg-[var(--lp-bg-deep)] text-[var(--lp-ink-inverse)]">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-20 md:grid-cols-3 md:gap-14 md:px-10 md:py-28">
        {items.map((item) => (
          <div key={item.title} className="lp-rise">
            <div className="h-px w-10 bg-[var(--lp-accent)]" />
            <h3 className="mt-6 text-[20px] font-medium leading-[1.2] tracking-[-0.02em] text-balance md:text-[22px]">
              {item.title}
            </h3>
            <p className="mt-4 text-[15px] leading-[1.65] text-[#a49c92]">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
