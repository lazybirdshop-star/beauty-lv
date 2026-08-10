'use client';

import { cn } from '@/lib/utils';

import type { ProfileShellProps } from '../../contracts/sections';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас панельного мира (§5, слот `Shell`): hero над панелью, которая
 * наезжает на него. Извлечён из `app/[slug]/(public)/layout.tsx` на шаге M2
 * без изменения разметки; тернарник luxury (занавес первого кадра)
 * переехал вместе с soft-деревом и живёт до M4 (§12).
 */
export function Shell({ org, children }: ProfileShellProps) {
  /* Церемония первого кадра Luxury (§7): поле собственной земли мира
     поднимается за 640ms и открывает страницу — один раз за визит, так как
     layout переживает клиентские переходы внутри сегмента. Чистый CSS на
     кривой-шторе мира; закон А5 снимает её мгновенно для посетителей с
     reduced-motion. */
  const luxuryCurtain = org.designPresetKey === 'luxury';

  return (
    <>
      {luxuryCurtain ? (
        <div
          aria-hidden="true"
          className="anim-luxury-curtain pointer-events-none fixed inset-0 z-[60] bg-bg"
        />
      ) : null}

      <div className="relative mx-auto flex min-h-[100dvh] max-w-[520px] flex-col lg:max-w-6xl lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-10">
        <div className="lg:sticky lg:top-10 lg:w-[340px] lg:shrink-0 xl:w-[380px]">
          <OrgHeader org={org} />
        </div>

        {/* Фирменное перекрытие: панель наезжает на hero и размывает его,
            так что hero видимо проходит под ней, а не останавливается у шва.
            Рядом друг с другом шва нет, поэтому с `lg` это обычная карточка. */}
        <div
          className={cn(
            /* Hero продолжается под панелью, а не обрывается у шва: перекрытие
               — собственность мира (`--panel-overlap`, −96px по умолчанию —
               -mt-24, который этот класс раньше зашивал), а собственный blur
               панели — то, сквозь что hero виден. `panel` несёт стеклянные
               токены дизайна — светлую кромку и верхний блик, — поэтому
               граница читается как подсвеченное стекло над изображением, а не
               как карточка, припаркованная поверх. */
            'panel relative mt-[var(--panel-overlap)] flex-1 rounded-t-[var(--panel-radius)] px-0 pb-0 pt-1',
            'lg:mt-0 lg:min-w-0 lg:self-stretch lg:rounded-[var(--panel-radius)]',
          )}
        >
          <OrgNav
            slug={org.slug}
            showPrices={org.showPricesSection}
            showContacts={org.showContactsSection}
            design={org.designPresetKey}
          />
          {children}
        </div>
      </div>
    </>
  );
}
