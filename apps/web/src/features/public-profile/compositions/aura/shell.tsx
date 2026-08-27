'use client';

import type { ProfileShellProps } from '../../contracts/sections';
import { MadeOnAmolie } from '../../shared/made-on-amolie';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас мира AURA (`aura.html`, `.page`): узкий лист над дышащей авророй.
 *
 * Три слоя, ровно как в файле. Первый — четыре пастельных поля авроры,
 * `fixed` под всем остальным; они дышат вечно и не принимают касаний.
 * Второй — содержимое: шапка, липкая навигация, разделы. Третий —
 * плавающая капсула действия, живущая внутри секции записи.
 *
 * Ширина — 430px на телефоне, как в файле, и 1160px на десктопе, где мир
 * раскладывается в две колонки (это тоже описано в файле, блоком
 * `@media (min-width: 900px)`). Промежуточных ширин у мира нет: он либо
 * телефонный лист, либо разворот.
 *
 * Поля авроры перечислены здесь, а не в CSS, по одной причине: их четыре,
 * они различаются размером, положением и тактом дыхания, и таблица из
 * четырёх строк читается лучше, чем четыре почти одинаковых правила.
 */
const FIELDS = [
  {
    key: 'a1',
    className: 'h-[320px] w-[320px] -top-[100px] left-[30%] opacity-75',
    color: '#F3C6D0',
    breath: '9s',
    delay: '0s',
  },
  {
    key: 'a2',
    className: 'h-[280px] w-[280px] top-[22%] -left-[120px] opacity-70',
    color: '#CBDDF2',
    breath: '12s',
    delay: '1.2s',
  },
  {
    key: 'a3',
    className: 'h-[300px] w-[300px] top-[55%] -right-[120px] opacity-70',
    color: '#DDD2F4',
    breath: '11s',
    delay: '0.6s',
  },
  {
    key: 'a4',
    className: 'h-[260px] w-[260px] -bottom-[4%] left-[10%] opacity-60',
    color: '#D6EBDD',
    breath: '13s',
    delay: '2s',
  },
] as const;

export function Shell({ org, children }: ProfileShellProps) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-[22px] pb-12 lg:max-w-[1160px] lg:px-10">
      {FIELDS.map((field) => (
        <span
          key={field.key}
          aria-hidden="true"
          className={`aura-field ${field.className}`}
          style={{
            background: `radial-gradient(circle, ${field.color}, transparent 65%)`,
            ['--aura-breath' as string]: field.breath,
            animationDelay: field.delay,
          }}
        />
      ))}

      {/* Содержимое встаёт над авророй собственным контекстом наложения:
          поля `fixed` с `z-index: 0`, и без этого слоя стеклянные листы
          оказались бы под светом, а не над ним. */}
      <div className="relative z-[2] flex min-w-0 flex-1 flex-col">
        <OrgHeader org={org} />
        <OrgNav org={org} />
        <main className="min-w-0 flex-1">{children}</main>
        {/* Тот же микрокапс с разрядкой, что у «ЗАПИСЬ ОНЛАЙН» над именем, —
            мир подписывает себя своим же голосом. */}
        <MadeOnAmolie className="pb-4 pt-10 text-center text-[9.5px] uppercase tracking-[0.3em] text-ink-faint" />
      </div>
    </div>
  );
}
