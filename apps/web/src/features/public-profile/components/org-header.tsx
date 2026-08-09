'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';

import type { PublicOrganization } from '../engine/types';

/**
 * The hero as a poster, not a profile header.
 *
 * The template this replaces — cover photo, round avatar overlapping it,
 * name, rating — is what every booking product ships, and it makes one
 * master indistinguishable from the next. Here the name is the poster's
 * type: set hard-left across the full measure, breaking where the measure
 * runs out rather than where a designer would prefer, because that break is
 * what makes it read as printed rather than laid out.
 *
 * The photograph is cropped by a colour field instead of a frame. No radius,
 * no ring, no shadow: the field is the crop, the way a poster's ink block is
 * the crop.
 */

const ACTION_CLASS =
  'press flex h-11 w-11 items-center justify-center border border-border-strong text-ink hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function OrgHeader({ org }: { org: PublicOrganization }) {
  const t = useT();
  /* This header is the poster world's own — the layout renders it only for
     `poster`; every other design takes the panel tree. No second voice is
     needed inside it. */
  const showBanner = org.heroStyle === 'image' && Boolean(org.coverUrl);
  const image = showBanner ? org.coverUrl : org.logoUrl;

  return (
    <header className="relative flex min-h-[52dvh] flex-col overflow-hidden bg-bg lg:min-h-full">
      {/* The photograph fills the field and is knocked back so poster type
          sits on it at full strength. A master's own photo is the one piece
          of content this page cannot author, so the world has to accept any
          of them: the wash is what makes an over-lit phone snap and a studio
          shot land in the same poster. */}
      {image ? (
        <div aria-hidden="true" className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover opacity-[0.42] contrast-125 saturate-[0.35]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/65 to-bg" />
        </div>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-accent" />
      )}

      <div className="relative flex flex-1 flex-col px-5 pb-6 pt-5 lg:px-10 lg:pb-10 lg:pt-9">
        <div className="flex items-start justify-between gap-3">
          {org.city ? (
            <span className="inline-flex items-center gap-1.5 border border-border-strong px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
              <MapPin size={12} weight="fill" className="text-accent" />
              {org.city}
            </span>
          ) : (
            <span />
          )}

          <div className="flex shrink-0 gap-2">
            {org.phone ? (
              <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ACTION_CLASS}>
                <Phone size={17} weight="fill" />
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
                <InstagramLogo size={17} />
                <span className="sr-only">{t.publicPage.masterInstagram}</span>
              </a>
            ) : null}
          </div>
        </div>

        {/* Pushed to the foot of the field: poster type sits low, above the
            fold's edge, so the image has room to be an image. */}
        <div className="mt-auto pt-14">
          <h1 className="font-display text-[clamp(2.6rem,13vw,4.4rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.03em] text-ink lg:text-[clamp(3rem,4.6vw,5rem)]">
            {org.name}
          </h1>

          {org.tagline ? (
            <p className="mb-2 mt-5 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">
              {org.tagline}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
