'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';

import type { PublicOrganization } from '../types';
import { HeroGradient } from './hero-gradient';

const ACTION_CLASS =
  'press glass flex h-11 w-11 items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/* Minimal's action icons: an 8px hairline square — the world's control
   shape — instead of a frosted circle (BRAND_STYLES §6). */
const MINIMAL_ACTION_CLASS =
  'press flex h-11 w-11 items-center justify-center rounded-[var(--control-radius)] border border-border bg-bg-raised text-ink transition-colors duration-[var(--dur-hover)] hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/* Luxury's action icons: the outlined square of the editorial reference —
   a champagne rule with no fill; on hover the edge and the glyph travel
   into gold over the world's own 300ms (§7). */
const LUXURY_ACTION_CLASS =
  'luxury-action flex h-11 w-11 items-center justify-center rounded-[var(--control-radius)] border border-border-strong bg-transparent text-ink hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/* The hero photograph's warm vignette (§7): the edges sink into the
   world's own ground — warm near-black, never a cold grey — while the
   centre keeps the face or the work. */
const LUXURY_VIGNETTE =
  'radial-gradient(130% 115% at 50% 40%, transparent 46%, color-mix(in srgb, var(--bg) 78%, transparent) 100%)';

export function OrgHeader({ org }: { org: PublicOrganization }) {
  const t = useT();
  /* The Minimal hero is typographic: no banner field, no gradient wash —
     the name, the specialization line and air on a flat ground (§6). */
  const minimal = org.designPresetKey === 'minimal';
  /* The Luxury hero is a ceremony on the centred axis: a thin gold rule,
     the name in Cormorant, and the photograph as a framed cinematic frame
     (§7). */
  const luxury = org.designPresetKey === 'luxury';
  const actionClass = minimal ? MINIMAL_ACTION_CLASS : luxury ? LUXURY_ACTION_CLASS : ACTION_CLASS;
  /* A transparent PNG is how a master supplies a cut-out portrait, and the
     extension is the only signal available without decoding the file. The
     cut-out treatment needs the panel's overlap to dissolve into, which
     Minimal and Luxury do not have — there the photo is always a quiet
     field or a framed one. */
  const cutout = !minimal && !luxury && /\.png($|\?)/i.test(org.logoUrl ?? '');
  const showBanner = !minimal && org.heroStyle === 'image' && Boolean(org.coverUrl);

  /* ── Luxury (§7, по референсу мастера): редакционная ось слева ───────
     Город капсом у левого поля, контурные квадраты действий у правого,
     огромное имя антиквой капсом и подпись в разрядку. Фотография мастера
     живёт не здесь, а в карточке ближайшего окна (см. booking-calendar). */
  if (luxury) {
    return (
      <header className="relative px-5 pb-12 pt-5 lg:overflow-hidden lg:rounded-[var(--panel-radius)] lg:border lg:border-border lg:px-7 lg:pb-14 lg:pt-7">
        {showBanner ? (
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={org.coverUrl} alt="" className="h-full w-full object-cover" />
            {/* Low key with the warm vignette: the edges sink into the
                ground, the centre keeps the subject; the bottom falls to
                the page ground so the type reads on any upload. */}
            <div className="absolute inset-0" style={{ backgroundImage: LUXURY_VIGNETTE }} />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/25" />
          </div>
        ) : (
          /* No photograph: the quiet candle-light from above the spec
             allows — from bg-raised to transparent, a candle, not a
             spotlight (§7 «Фоны»). */
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(90% 55% at 50% 0%, var(--bg-raised) 0%, transparent 72%)',
            }}
          />
        )}

        <div className="relative">
          {/* The top bar of the reference: the city in wide caps at the
              left margin, the outlined square actions at the right. */}
          <div className="flex items-center justify-between gap-3">
            {org.city ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                <MapPin size={13} weight="fill" className="text-accent" />
                {org.city}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex gap-2">
              {org.phone ? (
                <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={actionClass}>
                  <Phone size={18} />
                  <span className="sr-only">{t.publicPage.callMaster}</span>
                </a>
              ) : null}
              {org.instagram ? (
                <a
                  href={`https://instagram.com/${org.instagram}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={actionClass}
                >
                  <InstagramLogo size={18} />
                  <span className="sr-only">{t.publicPage.masterInstagram}</span>
                </a>
              ) : null}
            </div>
          </div>

          {/* The name is the poster of the page: Cormorant in caps, as
              large as the line allows, left-aligned. Its entrance is part
              of the first-frame ceremony — a 12px rise with a fade over
              600ms, 150ms in (§7 «Движение»). */}
          <h1 className="anim-luxury-rise mt-10 font-display text-[48px] uppercase leading-[1.02] tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink lg:mt-14 lg:text-[64px]">
            {org.name}
          </h1>

          {org.tagline ? (
            <p className="mt-6 max-w-[38ch] text-[11px] font-medium uppercase leading-relaxed tracking-[0.14em] text-ink-soft">
              {org.tagline}
            </p>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        /* The bottom pad is what the panel rides into: 16px of real air
           minus the world's `--panel-overlap` (−96px by default — the pb-28
           this used to hard-code; 16px net where the overlap is 0). Minimal
           keeps its 48px section rhythm instead (§6). */
        'relative px-5 pb-[calc(1rem_-_var(--panel-overlap))] pt-4 lg:overflow-hidden lg:rounded-[var(--panel-radius)] lg:px-7 lg:pb-8 lg:pt-7 lg:shadow-[var(--media-shadow)]',
        minimal && 'pb-12',
      )}
    >
      {minimal ? null : showBanner ? (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-full overflow-hidden">
          {/* Masters paste an arbitrary photo URL — plain <img> rather than
              opening next/image's optimizer to any remote host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={org.coverUrl} alt="" className="h-full w-full object-cover" />
          {/* The name sits on top of an unknown photo, so it needs its own
              floor of contrast rather than trusting whatever was uploaded. */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/35" />
        </div>
      ) : (
        /* The gradient is the hero's surface. No frosted layer of its own:
           the panel below is what overlaps it, and two sheets of glass
           stacked would flatten the gradient and read as one slab. */
        <HeroGradient />
      )}

      <div className="relative">
        <div className="flex justify-end gap-2">
          {org.phone ? (
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={actionClass}>
              <Phone size={18} weight="fill" />
              <span className="sr-only">{t.publicPage.callMaster}</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={actionClass}
            >
              <InstagramLogo size={18} />
              <span className="sr-only">{t.publicPage.masterInstagram}</span>
            </a>
          ) : null}
        </div>

        {/* Minimal reorders the composition (§6): the photo is a small quiet
            field below the name on a phone and right of the text on desktop,
            never a backdrop. */}
        <div
          className={cn(
            minimal
              ? 'relative mt-6 flex flex-col gap-5 lg:mt-8 lg:flex-row lg:items-end lg:gap-5'
              : 'relative mt-2 flex items-end gap-4 lg:mt-4 lg:flex-col-reverse lg:items-stretch lg:gap-5',
          )}
        >
          <div className="min-w-0 flex-1 pb-1">
            {org.city ? (
              <span
                className={cn(
                  minimal
                    ? 'press inline-flex items-center gap-1.5 rounded-[var(--chip-radius)] border border-border bg-bg-raised px-3 py-1.5 text-[13px] font-semibold text-ink'
                    : 'glass press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink',
                )}
              >
                <MapPin size={14} weight="fill" className="text-accent" />
                {org.city}
              </span>
            ) : null}

            {/* Weight and tracking are the world's own tokens: `inherit` and
                product-tight by default, Inter 600 at −0.03em in Minimal. */}
            <h1 className="mt-3 font-display text-[38px] leading-[1.05] tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink lg:text-[32px]">
              {org.name}
            </h1>

            {org.tagline ? (
              <p className="mt-2.5 line-clamp-3 max-w-prose text-sm leading-relaxed text-ink-soft">
                {org.tagline}
              </p>
            ) : null}
          </div>

          {/* A cut-out photo has no edge of its own, so a card frame would draw
              a border the subject does not have. It runs past the hero's foot
              instead and its lower part is taken by the panel's blur — the
              boundary is light and overlap, which is what this glass world
              uses everywhere else rather than a rule.

              How deep it runs is the whole point: measured, the portrait used
              to sit 47% under the panel, so the subject was mostly hidden. It
              now stands on the panel's edge, and its last 5% is a gradient to
              transparent — the photo ends by dissolving at that line instead of
              being cut off by it, so the seam disappears without needing depth
              to hide it.

              Nothing crosses the line: the box ends on it, so the fade runs out
              exactly there and no ghost of the photo trails on beneath the
              panel. Raising the portrait therefore means growing the box — the
              foot stays on the line, the head goes up.

              A photo that carries its own background keeps the card: without
              one it would end in a hard rectangular cut against the gradient. */}
          {org.showAvatar ? (
            <div
              className={cn(
                minimal
                  ? /* A small calm field: the 12px media radius and no shadow
                       come from the tokens; the squircle (`--avatar-radius`)
                       frames the initials tile when there is no photo. */
                    'relative h-[200px] w-[190px] shrink-0 lg:h-[148px] lg:w-[148px]'
                  : 'relative h-[228px] w-[42%] max-w-[190px] shrink-0 sm:h-[271px] lg:h-[190px] lg:w-full lg:max-w-none',
                minimal
                  ? org.logoUrl
                    ? 'overflow-hidden rounded-[var(--media-radius)] shadow-[var(--media-shadow)]'
                    : 'rounded-[var(--avatar-radius)]'
                  : cutout
                    ? '-mb-4 self-end drop-shadow-[0_18px_28px_rgb(0_0_0/0.18)] lg:-mb-14'
                    : 'overflow-hidden rounded-[var(--media-radius)] shadow-[var(--media-shadow)]',
              )}
            >
              {org.logoUrl ? (
                // Masters paste an arbitrary photo URL, so this stays a plain <img>
                // rather than opening next/image's optimizer to any remote host.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logoUrl}
                  alt=""
                  loading="lazy"
                  className={cn(
                    'h-full w-full',
                    cutout
                      ? [
                          'object-contain',
                          // The fade *finishes* on the panel's edge instead of
                          // starting there: the photo is fully gone by the time
                          // it reaches the line, and nothing of it trails on
                          // underneath. It is short — the last 2.5% — because a
                          // long one eats the visible bottom and leaves the
                          // figure looking as if it hovers above the edge.
                          // Prefixed too: Safari still needs -webkit-mask-image.
                          '[mask-image:linear-gradient(to_bottom,#000_97.5%,transparent_100%)]',
                          '[-webkit-mask-image:linear-gradient(to_bottom,#000_97.5%,transparent_100%)]',
                        ]
                      : 'object-cover',
                  )}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-[var(--avatar-radius)] bg-accent"
                  aria-hidden="true"
                >
                  <span className="font-display text-5xl text-accent-contrast">
                    {org.avatarInitials}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
