'use client';

import { InstagramLogo, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { HeaderProps } from '../../contracts/sections';

import { ICON_BUTTON_CLASS, LIVE_DOT_CLASS } from './ui';

/**
 * Шапка мира MINIMAL (`minimal.html`, `.top` + `.hero`): вордмарк, имя
 * слева, портрет справа.
 *
 * Портрет — **ручка «фото мастера»**, а не обложка шапки. В файле это блок
 * `--hero-bg` с инициалами, набранными тонким кеглем поверх градиента;
 * собственного поля под обложку у мира нет, и подставлять её сюда значило
 * бы показать не то, что мастер положила. Урок мира AURA.
 *
 * Имя разрезается надвое: первая половина чернью, вторая — приглушённым
 * серым (`h1 span` файла). Слов может быть и одно — тогда режется примерно
 * посередине строки, а не по пробелу, которого нет.
 */
export function OrgHeader({ org }: HeaderProps) {
  const t = useT();

  const portrait = org.design.masterPhoto.shown ? org.design.masterPhoto.media : null;

  /* Однобуквенный хвост не выделяется: серая буква рядом с чёрным именем
     читается опечаткой, а не приёмом. */
  const name = org.name.trim();
  const space = name.lastIndexOf(' ');
  const cut = space > 0 ? space : Math.ceil(name.length / 2);
  const head = name.slice(0, cut).trim();
  const tail = name.slice(cut).trim();
  const split = head.length > 0 && tail.length > 1;

  return (
    <header data-studio-zone="heroPhoto">
      <div className="flex items-center justify-between gap-3 px-[22px] pt-[18px] lg:px-10 lg:pt-7">
        <div className="min-w-0 truncate font-display text-[17px] font-extrabold tracking-[-0.04em] text-ink lg:text-[19px]">
          {org.name}
          <span className="text-accent">.</span>
        </div>

        <div className="flex shrink-0 gap-2">
          {org.phone ? (
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ICON_BUTTON_CLASS}>
              <Phone size={15} weight="regular" />
              <span className="sr-only">{t.publicPage.callMaster}</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={ICON_BUTTON_CLASS}
            >
              <InstagramLogo size={15} weight="regular" />
              <span className="sr-only">{t.publicPage.masterInstagram}</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="anim-minimal-rise grid grid-cols-[1.15fr_.85fr] items-center gap-x-4 px-[22px] pt-[26px] lg:grid-cols-[1fr_1.05fr] lg:gap-x-14 lg:px-10 lg:pt-11">
        <p className="col-span-2 mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-ink-soft lg:col-span-1 lg:text-sm">
          <span aria-hidden="true" className={LIVE_DOT_CLASS} />
          {[org.city, t.publicPage.onlineBooking].filter(Boolean).join(' · ')}
        </p>

        <div className="col-start-1 min-w-0">
          <h1 className="font-display text-[clamp(2.125rem,10.5vw,2.875rem)] font-bold leading-[1.02] tracking-[var(--display-tracking)] text-ink lg:text-[68px]">
            {split ? (
              <>
                {head}
                <br />
                <span className="text-ink-soft">{tail}</span>
              </>
            ) : (
              name
            )}
          </h1>

          {org.tagline ? (
            <p className="mt-3 text-[14.5px] leading-[1.5] tracking-[-0.01em] text-ink-soft lg:mt-4 lg:max-w-[400px] lg:text-[17px]">
              {org.tagline}
            </p>
          ) : null}
        </div>

        {/*
          Портрет — блок, тянущийся по высоте колонки. С фотографией он
          заполняется целиком; без неё внутри стоят инициалы тонким кеглем
          на градиенте `--hero-bg` файла.
        */}
        <div
          className="col-start-2 row-span-2 row-start-1 h-full min-h-[220px] overflow-hidden rounded-[var(--media-radius)] shadow-[var(--media-shadow)] lg:row-span-3 lg:h-[380px] lg:min-h-0 lg:rounded-[30px]"
          style={{
            backgroundImage:
              'radial-gradient(120% 90% at 80% 0%, color-mix(in srgb, var(--accent) 12%, var(--bg-raised)) 0%, transparent 55%), linear-gradient(180deg, var(--bg-sunken), var(--bg-sunken))',
          }}
        >
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
              className={cn(
                'flex h-full w-full items-center justify-center font-display text-[84px] font-extralight tracking-[-0.06em] text-ink/[0.09]',
                'lg:text-[190px]',
              )}
            >
              {org.avatarInitials}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
