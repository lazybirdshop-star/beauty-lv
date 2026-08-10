'use client';

import type { ProfileShellProps } from '../../contracts/sections';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас мира Neo Glass (BRAND_STYLES.md §9 «Композиция», слот `Shell`):
 * глубина как конструкция, три слоя.
 *
 * Первый — статичный амбайент земли; его рисует продуктовый
 * `AmbientBackdrop`, который серверный layout кладёт `fixed` под каждым
 * миром со стеклом, а `motion.css` этого мира уводит его третье поле из
 * зелени в петроль. Фон не анимируется никогда: глубина статична, движется
 * только интерфейс.
 *
 * Второй — парящие стеклянные острова: навигация, факты, календарный лист,
 * карточки. Единой панели-листа у мира нет — острова разделены самим
 * амбайентом, и стопка островов наезжает на шапку глубже других миров
 * (`--panel-overlap: -32px`), паря над ней.
 *
 * Третий — плавающие капсулы действия: липкая CTA календаря и шторка.
 *
 * На телефоне шапка отстаёт от островов параллаксом (scroll-timeline,
 * прогрессивное улучшение); на десктопе то же отставание даёт липкая
 * стеклянная колонка шапки — материал ей выдаёт `neo-glass-column`.
 */
export function Shell({ org, children }: ProfileShellProps) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-5 pb-10 lg:max-w-[1120px] lg:flex-row lg:items-start lg:gap-7 lg:px-8 lg:py-10">
      <div className="neo-glass-parallax lg:sticky lg:top-10 lg:w-[352px] lg:shrink-0 xl:w-[392px]">
        <div className="neo-glass-pane neo-glass-column rounded-[var(--panel-radius)] lg:p-6">
          <OrgHeader org={org} />
        </div>
      </div>

      {/* Стопка островов: свой ритм 14px между объектами — плотнее светлых
          миров, как и требует «карточная» школа этого мира. */}
      <div className="mt-[var(--panel-overlap)] flex min-w-0 flex-1 flex-col gap-3.5 lg:mt-0">
        <OrgNav org={org} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
