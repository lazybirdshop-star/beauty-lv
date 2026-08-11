'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { useT } from '@/lib/i18n';

import type { HeaderProps } from '../../contracts/sections';
import { HeroFrameMedia, heroFrameUrl } from '../../shared/hero-media';

/* Действия шапки: точные квадраты 8px с волосяной линейкой — форма контрола
   этого мира (§6). Hover укрепляет край за 100ms, и всё: интерфейс отвечает,
   а не анимируется. Зона 44×44 честная. */
const ACTION_CLASS =
  'flex h-11 w-11 items-center justify-center rounded-[var(--control-radius)] border border-border bg-bg-raised text-ink transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/* Тихое действие hero: контур по `border-strong` — secondary в словаре мира
   (§6 «Кнопки»). Primary на первом экране один, и он остаётся за секцией
   записи (закон продукта «одна primary-кнопка на экран»). */
const HERO_ACTION_CLASS =
  'mt-7 inline-flex h-11 items-center justify-center rounded-[var(--control-radius)] border border-border-strong px-5 text-sm font-semibold text-ink transition-colors duration-[var(--dur-hover)] ease-[var(--ease-style)] hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Hero мира Minimal (§6 «Hero»): типографический по умолчанию — имя крупно,
 * строка специализации, кнопка записи. Никакого баннера и градиентной
 * подложки: `coverUrl`/`heroStyle` здесь не читаются сознательно, фотография
 * фоном не бывает никогда. Фото мастера — маленькое спокойное поле под именем
 * на телефоне и справа от текста на десктопе, радиус 12px, без тени и вуали;
 * без фото — squircle-монограмма (`--avatar-radius: 30%`).
 *
 * Иерархия строится кеглем и полями: Inter 600 с трекингом −0.03em (токены
 * `--display-*`), подпись мерой 52ch, метаданные — `ink-faint`.
 */
export function OrgHeader({ org }: HeaderProps) {
  const t = useT();

  return (
    <header data-studio-zone="heroPhoto" className="pb-12 pt-6 lg:pb-14 lg:pt-10">
      {/* Служебная полоса: город как строка метаданных слева, действия —
          тихие квадраты справа. */}
      <div className="flex items-center justify-between gap-3">
        {org.city ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-faint">
            <MapPin size={13} weight="light" aria-hidden="true" />
            {org.city}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="flex gap-2">
          {org.phone ? (
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ACTION_CLASS}>
              <Phone size={18} weight="light" />
              <span className="sr-only">{t.publicPage.callMaster}</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={ACTION_CLASS}
            >
              <InstagramLogo size={18} weight="light" />
              <span className="sr-only">{t.publicPage.masterInstagram}</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-8 lg:mt-10 lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-[34px] leading-[1.08] tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink lg:text-[40px]">
            {org.name}
          </h1>

          {org.tagline ? (
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
              {org.tagline}
            </p>
          ) : null}

          {/* Якорь, а не кнопка потока: ведёт к секции записи на главной —
              и с цен, и с контактов возвращает на неё же. */}
          <Link href={`/${org.slug}#booking`} className={HERO_ACTION_CLASS}>
            {t.publicPage.book}
          </Link>
        </div>

        {org.design.masterPhoto.shown || org.design.heroPhoto ? (
          <div className="mt-8 shrink-0 lg:mt-0">
            {heroFrameUrl(org.design) ? (
              <HeroFrameMedia
                design={org.design}
                className="h-[188px] w-[188px] rounded-[var(--media-radius)] lg:h-[152px] lg:w-[152px]"
              />
            ) : (
              <div
                className="flex h-[96px] w-[96px] items-center justify-center rounded-[var(--avatar-radius)] bg-accent"
                aria-hidden="true"
              >
                <span className="font-display text-3xl [font-weight:var(--display-weight)] text-accent-contrast">
                  {org.avatarInitials}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
