import type { Messages } from '@/lib/i18n/messages';

/**
 * Переписка в директе — то, что продукт отменяет.
 *
 * Единственное место лендинга, где показано «до». Стоит сразу после первого
 * экрана и работает парой к нему: справа вверху страница, которая принимает
 * запись сама, здесь — пять сообщений и два часа, которые она заменяет.
 * Утверждать, что «мастера теряют N часов», продукт не вправе (чисел у него
 * нет), поэтому цена названа тем, что видно в самой переписке.
 *
 * Ни имени, ни ника: PRODUCT.md запрещает выдумывать людей, а разговор
 * узнаётся и без них — по времени между репликами.
 */
export function Thread({ t }: { t: Messages['marketing'] }) {
  const messages = [
    { from: 'client' as const, text: t.chatMsg1, at: '09:41' },
    { from: 'master' as const, text: t.chatMsg2, at: '11:20' },
    { from: 'master' as const, text: t.chatMsg3, at: '11:22' },
    { from: 'client' as const, text: t.chatMsg4, at: '11:24' },
    { from: 'master' as const, text: t.chatMsg5, at: '13:58' },
  ];

  return (
    <section className="mx-auto max-w-[1240px] px-6 pb-20 md:px-10 md:pb-32">
      <div className="grid items-center gap-12 md:grid-cols-[0.95fr_1.05fr] md:gap-16 lg:gap-24">
        {/* Порядок в разметке и есть порядок чтения на обоих вьюпортах:
            подпись называет сцену, переписка её показывает. Перестановка
            колонок на телефоне давала пузыри раньше объяснения. */}
        <div className="lp-rise">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--lp-ink-faint)]">
            {t.chatTitle}
          </p>
          <p className="lp-measure mt-6 text-[20px] leading-[1.45] tracking-[-0.01em] text-balance md:text-[24px]">
            {t.chatCaption}
          </p>
        </div>

        <div className="lp-rise">
          <div className="mx-auto w-full max-w-[380px] rounded-[24px] bg-[var(--lp-bg-raised)] p-4 shadow-[0_24px_60px_-32px_rgba(22,19,15,0.35)] sm:p-5">
            {/* Шапка треда: кружок вместо аватара и надпись «сейчас в сети» —
                ровно столько узнаваемости директа, сколько нужно, чтобы
                сцена читалась, и ни одного чужого знака. */}
            <div className="flex items-center gap-3 border-b border-[var(--lp-rule)] pb-4">
              <span className="h-9 w-9 rounded-full bg-[var(--lp-rule)]" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-medium leading-tight">{t.chatWho}</p>
                <p className="text-[11px] leading-tight text-[var(--lp-ink-faint)]">
                  {t.chatOnline}
                </p>
              </div>
            </div>

            <ol className="flex flex-col gap-2.5 pt-4">
              {messages.map((message, index) => (
                <li
                  key={index}
                  className={`flex flex-col ${
                    message.from === 'client' ? 'items-start' : 'items-end'
                  }`}
                >
                  <span
                    className={`max-w-[85%] rounded-[18px] px-3.5 py-2.5 text-[14px] leading-[1.4] ${
                      message.from === 'client'
                        ? 'rounded-bl-[6px] bg-[#e7e2da] text-[var(--lp-ink)]'
                        : 'rounded-br-[6px] bg-[var(--lp-ink)] text-[var(--lp-ink-inverse)]'
                    }`}
                  >
                    {message.text}
                  </span>
                  <span className="px-1 pt-1 text-[10px] tabular-nums text-[var(--lp-ink-faint)]">
                    {message.at}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
