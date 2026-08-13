'use client';

import { InstagramLogo, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';

import type { HeaderProps } from '../../contracts/sections';
import { HeroFrameMedia, heroFrameUrl } from '../../shared/hero-media';

import { cascade, ICON_BUTTON_CLASS, ORB_RING } from './ui';

/**
 * Шапка мира AURA (`aura.html`, `.top` + `.hero`): орб, имя, обещание.
 *
 * Верхняя полоса — вордмарк слева, круглые стеклянные иконко-кнопки справа.
 * Вордмарком служит город: он единственная короткая строка идентичности,
 * которая не повторяет имя двумя кеглями подряд, а разрезанный трекингом
 * капс — ровно тот жест, которым набран `.brand` файла.
 *
 * Центр — орб: 120px окружности с переливающимся кольцом, внутри перламутр
 * земли и инициалы мастера. Это тот самый `--hero-bg` из списка изменяемых
 * параметров: поставила фото — орб становится портретом, кольцо остаётся.
 * Кольцо дышит вместе с авророй, поэтому первое, что видит человек, —
 * живой объект, а не аватар в кружке.
 *
 * Ниже — служебная строка, имя тонким дисплейным начертанием с последним
 * словом в градиенте (`h1 b` файла) и обещание одной фразой.
 */
export function OrgHeader({ org }: HeaderProps) {
  const t = useT();

  const portraitUrl = heroFrameUrl(org.design);
  const showPortrait = portraitUrl !== undefined && org.design.masterPhoto.shown;

  /* Последнее слово имени берёт градиент — приём `h1 b` файла. Имя из
     одного слова остаётся целым: подсвечивать в нём нечего, и половина
     слова в градиенте была бы не акцентом, а разрезом. */
  const words = org.name.trim().split(/\s+/);
  const lead = words.length > 1 ? words.slice(0, -1).join(' ') : org.name;
  const tail = words.length > 1 ? words[words.length - 1] : null;

  return (
    <header data-studio-zone="heroPhoto" className="pt-5">
      <div className="flex items-center justify-between gap-3">
        {org.city ? (
          <span className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-[0.4em] text-ink">
            {org.city}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}

        <div className="flex shrink-0 gap-2.5">
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

      <div className="anim-aura-rise pt-8 text-center lg:pt-14" style={cascade(0)}>
        {/* Орб. Кольцо — переливающийся конический градиент под слоем земли;
            без фотографии внутри стоят инициалы, с фотографией — она сама.
            Размер круга задан в px, а не долей ширины: орб держит свою меру
            и на телефоне, и на развороте. */}
        <div className="relative mx-auto h-[120px] w-[120px] lg:h-[160px] lg:w-[160px]">
          <span
            aria-hidden="true"
            className="aura-orb-glow absolute inset-0 rounded-full shadow-[var(--media-shadow)]"
            style={{ background: ORB_RING, ['--aura-breath' as string]: '7s' }}
          />
          <span aria-hidden="true" className="absolute inset-[7px] rounded-full bg-bg opacity-90" />

          {showPortrait ? (
            <HeroFrameMedia
              design={org.design}
              className="absolute inset-[7px] rounded-full"
              imageClassName="rounded-full"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold tracking-[0.06em] text-ink lg:text-[30px]">
              {org.avatarInitials}
            </span>
          )}
        </div>

        <p className="mt-[22px] text-[10.5px] font-medium uppercase tracking-[0.42em] text-ink-faint">
          {t.publicPage.onlineBooking}
        </p>

        <h1 className="mt-3.5 font-display text-[clamp(2.375rem,11vw,2.75rem)] leading-[1.05] tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink lg:text-[62px]">
          {lead}
          {tail ? (
            <>
              {' '}
              <b className="aura-grad-text font-semibold">{tail}</b>
            </>
          ) : null}
        </h1>

        {org.tagline ? (
          <p className="mx-auto mt-3.5 max-w-[290px] text-[13.5px] font-light leading-[1.75] text-ink-soft lg:max-w-[420px] lg:text-[15px]">
            {org.tagline}
          </p>
        ) : null}
      </div>
    </header>
  );
}
