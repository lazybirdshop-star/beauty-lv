'use client';

import { cn } from '@/lib/utils';

import type { ProfileShellProps } from '../../contracts/sections';
import { OrgHeader } from './org-header';
import { OrgNav } from './org-nav';

/**
 * Каркас плакатного мира (§5, слот `Shell`): экран разделён на два поля.
 * Извлечён из `app/[slug]/(public)/layout.tsx` на шаге M2 без изменения
 * разметки.
 */
export function Shell({ org, children }: ProfileShellProps) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-[560px] flex-col lg:max-w-[1180px] lg:flex-row lg:items-stretch lg:gap-0">
      <div className="lg:sticky lg:top-0 lg:h-[100dvh] lg:w-[46%] lg:shrink-0">
        <OrgHeader org={org} />
      </div>

      {/* Плоское поле с жёсткой линейкой там, где у мягкого мира матовое
          стекло над hero: blur, скруглённые углы и парящая тень — словарь,
          который этот дизайн отказывается произносить, а шов объявлен, а не
          скрыт, — линейка 2px цвета вермильон. */}
      <div
        className={cn(
          'panel relative flex-1 border-t-2 border-accent px-0 pb-0 pt-0',
          'lg:min-w-0 lg:self-stretch lg:border-l-2 lg:border-t-0',
          org.design.background.kind === 'image' && 'bg-bg/90',
        )}
      >
        <OrgNav
          slug={org.slug}
          showPrices={org.showPricesSection}
          showContacts={org.showContactsSection}
          design={org.design.style}
        />
        {children}
      </div>
    </div>
  );
}
