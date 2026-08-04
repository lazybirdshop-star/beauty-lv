import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import type { PublicOrganization } from '../types';
import { HeroGradient } from './hero-gradient';

const ACTION_CLASS =
  'press glass flex h-11 w-11 items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function OrgHeader({ org }: { org: PublicOrganization }) {
  const showBanner = org.heroStyle === 'image' && Boolean(org.coverUrl);

  return (
    <header className="relative px-5 pb-28 pt-4 lg:overflow-hidden lg:rounded-[32px] lg:px-7 lg:pb-8 lg:pt-7 lg:shadow-hero">
      {showBanner ? (
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
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ACTION_CLASS}>
              <Phone size={18} weight="fill" />
              <span className="sr-only">Позвонить мастеру</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={ACTION_CLASS}
            >
              <InstagramLogo size={18} />
              <span className="sr-only">Instagram мастера</span>
            </a>
          ) : null}
        </div>

        <div className="relative mt-2 flex items-end gap-4 lg:mt-4 lg:flex-col-reverse lg:items-stretch lg:gap-5">
          <div className="min-w-0 flex-1 pb-1">
            {org.city ? (
              <span className="glass press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink">
                <MapPin size={14} weight="fill" className="text-accent" />
                {org.city}
              </span>
            ) : null}

            <h1 className="mt-3 font-display text-[38px] leading-[1.05] tracking-tight text-ink lg:text-[32px]">
              {org.name}
            </h1>

            {org.tagline ? (
              <p className="mt-2.5 line-clamp-3 max-w-prose text-sm leading-relaxed text-ink-soft">
                {org.tagline}
              </p>
            ) : null}
          </div>

          <div className="relative h-[170px] w-[38%] max-w-[168px] shrink-0 overflow-hidden rounded-[28px] shadow-hero sm:h-[210px] lg:h-[190px] lg:w-full lg:max-w-none">
            {org.logoUrl ? (
              // Masters paste an arbitrary photo URL, so this stays a plain <img>
              // rather than opening next/image's optimizer to any remote host.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-accent"
                aria-hidden="true"
              >
                <span className="font-display text-5xl text-accent-contrast">
                  {org.avatarInitials}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
