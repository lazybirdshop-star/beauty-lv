'use client';

import type { ProfileShellProps } from '../../contracts/sections';

import { MadeOnAmolie } from '../../shared/made-on-amolie';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас мира MINIMAL (`minimal.html`, `.page`): один светлый лист.
 *
 * Ширина 430px на телефоне и 1120px на развороте — ровно как в `@media
 * (min-width: 900px)` файла. Ни бегущей строки, ни сетки, ни рамок: у
 * этого мира нет ни одного украшения, и это его содержание, а не
 * недоделанность.
 *
 * Нижний отступ оставлен под липкую капсулу действия, которая живёт в
 * секции записи, — чтобы подвал не оказался под ней.
 */
export function Shell({ org, children }: ProfileShellProps) {
  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] bg-bg pb-14 lg:max-w-[1120px]">
      <div className="relative flex min-w-0 flex-col">
        <OrgHeader org={org} />
        <OrgNav org={org} />
        <main className="min-w-0 flex-1">{children}</main>
        {/* Без линейки и без капса: у мира нет ни одного украшения, и подвал
            не то место, где стоит завести первое. */}
        <MadeOnAmolie className="px-[22px] pb-10 pt-6 text-center text-[12.5px] tracking-[-0.01em] text-ink-faint lg:px-10" />
      </div>
    </div>
  );
}
