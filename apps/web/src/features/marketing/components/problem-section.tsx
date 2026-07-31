import { Reveal } from '@/components/motion/reveal';

function ChatBubble({ align, children }: { align: 'left' | 'right'; children: string }) {
  return (
    <div className={align === 'right' ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          align === 'right'
            ? 'max-w-[75%] rounded-2xl rounded-tr-sm bg-accent px-3.5 py-2 text-[13px] text-accent-contrast'
            : 'max-w-[75%] rounded-2xl rounded-tl-sm bg-bg-sunken px-3.5 py-2 text-[13px] text-ink'
        }
      >
        {children}
      </div>
    </div>
  );
}

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <Reveal>
          <h2 className="mb-4 max-w-sm text-3xl font-semibold tracking-tight text-ink text-balance">
            Мессенджер не заменяет систему записи
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Каждое «секунду, посмотрю ежедневник» повышает шанс, что клиент не дождётся и запишется
            к кому-то другому. А без напоминаний растёт процент неявок.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto flex max-w-sm flex-col gap-2 rounded-[20px] border border-border bg-bg-raised p-5 shadow-[0_1px_2px_rgba(39,22,32,.04),0_2px_8px_-4px_rgba(39,22,32,.08)]">
            <ChatBubble align="right">Здравствуйте! Есть окно в пятницу?</ChatBubble>
            <ChatBubble align="left">Секунду, посмотрю ежедневник…</ChatBubble>
            <ChatBubble align="left">Пятница занята, а суббота?</ChatBubble>
            <p className="pt-1 text-center text-xs text-ink-faint">прочитано · без ответа</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
