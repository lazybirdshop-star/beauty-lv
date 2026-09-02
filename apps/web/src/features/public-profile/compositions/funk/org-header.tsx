'use client';

import { InstagramLogo, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { HeaderProps } from '../../contracts/sections';

import { ICON_BUTTON_CLASS, STICKER_CLASS } from './ui';

/**
 * Шапка мира FUNK (`brutal.html`, `.top` + `.hero`): вордмарк, имя во всю
 * меру и портрет цветным блоком.
 *
 * Портрет — **ручка «фото мастера»**, а не обложка шапки. В файле это блок
 * `--hero-bg` с инициалами, набранными обводкой; собственного поля под
 * обложку у мира нет, и подставлять её сюда значило бы показать не то, что
 * мастер положила. Урок мира AURA, применённый сразу.
 *
 * Имя разрезается надвое: первая половина обводкой, вторая — лаймовым
 * блоком под углом (`h1 .out` и `h1 .lime` файла). Слов может быть и одно —
 * тогда режется по слогам самой строки, а не по пробелу, которого нет.
 */
export function OrgHeader({ org }: HeaderProps) {
  const t = useT();

  const portrait = org.design.masterPhoto.shown ? org.masterAvatar : null;

  /*
   * Разрез имени. По пробелу, если он есть; иначе — примерно посередине
   * строки. Однобуквенный хвост не выделяется: блок вокруг одной буквы
   * читается опечаткой, а не приёмом.
   */
  const name = org.name.trim().toUpperCase();
  const space = name.lastIndexOf(' ');
  const cut = space > 0 ? space : Math.ceil(name.length / 2);
  const head = name.slice(0, cut).trim();
  const tail = name.slice(cut).trim();
  const split = head.length > 0 && tail.length > 1;

  return (
    <header data-studio-zone="heroPhoto">
      <div className="flex items-center justify-between gap-3 px-[18px] pt-4 lg:px-10 lg:pt-6">
        <div className="min-w-0 truncate font-display text-[21px] font-black uppercase tracking-[-0.03em] text-ink lg:text-2xl">
          {org.name}
          <sup className="text-[10px] text-[var(--accent-to,var(--accent))]">®</sup>
        </div>

        <div className="flex shrink-0 gap-2">
          {org.phone ? (
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ICON_BUTTON_CLASS}>
              <Phone size={16} weight="bold" />
              <span className="sr-only">{t.publicPage.callMaster}</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(ICON_BUTTON_CLASS, 'bg-accent')}
            >
              <InstagramLogo size={16} weight="bold" />
              <span className="sr-only">{t.publicPage.masterInstagram}</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="anim-funk-pop flex items-center gap-3.5 px-[18px] pt-6 lg:gap-9 lg:px-10 lg:pt-11">
        <div className="min-w-0 flex-1">
          {org.city ? (
            <span className={cn(STICKER_CLASS, '-rotate-[1.5deg]')}>{org.city}</span>
          ) : null}

          <h1 className="mt-4 font-display text-[clamp(2.125rem,12vw,3rem)] font-black uppercase leading-[0.9] tracking-[var(--display-tracking)] text-ink lg:text-[96px]">
            {split ? (
              <>
                <span className="funk-outline">{head}</span>{' '}
                <span className="inline-block -rotate-1 border-[length:var(--rule-width)] border-solid border-ink bg-accent px-2 shadow-[var(--surface-shadow)]">
                  {tail}
                </span>
              </>
            ) : (
              name
            )}
          </h1>

          {org.tagline ? (
            <p className="mt-4 max-w-[320px] font-mono text-xs leading-[1.75] text-ink-soft lg:mt-6 lg:max-w-[400px] lg:text-[13px]">
              {org.tagline}
            </p>
          ) : null}
        </div>

        {/*
          Портрет — блок 4/5, посаженный под углом. С фотографией она
          заполняет блок целиком; без неё внутри стоят инициалы обводкой на
          лаймовом поле, как `--hero-bg` файла.
        */}
        <div className="funk-block relative aspect-[4/5] w-[158px] shrink-0 rotate-1 overflow-hidden bg-accent lg:w-[300px]">
          {portrait ? (
            /* Masters paste an arbitrary photo URL, so this stays a plain
               <img> rather than opening next/image's optimizer to any host. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portrait.url}
              alt=""
              className="h-full w-full object-cover [object-position:var(--avatar-focal)]"
            />
          ) : (
            <span
              aria-hidden="true"
              className="funk-outline flex h-full w-full items-center justify-center font-display text-[74px] font-black tracking-[-0.04em] lg:text-[140px]"
            >
              {org.avatarInitials}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
