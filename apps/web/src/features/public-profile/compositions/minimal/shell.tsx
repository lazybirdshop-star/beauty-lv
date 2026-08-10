'use client';

import type { ProfileShellProps } from '../../contracts/sections';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас мира Minimal (§6 «Композиция», слот `Shell`): страница — документ,
 * не витрина. Одна колонка с левой выключкой и мерой текста до 60ch на всех
 * вьюпортах — липкой шапки-карточки и двухколоночного сплита мягкого мира
 * здесь нет, как и самой «панели»: перекрытие — жест мягкого мира
 * (`--panel-overlap: 0` у этого стиля), шапку и содержимое делят волосяная
 * линейка навигации и воздух. Первый экран читается за секунду: имя, строка
 * специализации, тихое действие — и сразу запись.
 *
 * Секционный ритм самый разреженный из светлых миров — 48px; его несут сами
 * секции (каждая начинается с `pt-12`), каркас задаёт только колонку.
 */
export function Shell({ org, children }: ProfileShellProps) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[640px] flex-col px-5">
      <OrgHeader org={org} />
      <OrgNav org={org} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
