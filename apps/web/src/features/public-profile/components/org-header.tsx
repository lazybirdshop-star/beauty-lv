import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import type { PublicOrganization } from '../types';

const ACTION_CLASS =
  'press glass flex h-11 w-11 items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function OrgHeader({ org }: { org: PublicOrganization }) {
  return (
    <header className="relative px-5 pb-10 pt-4">
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

        <div className="relative mt-2 flex items-end gap-4">
          <div className="min-w-0 flex-1 pb-1">
            {org.city ? (
              <span className="glass press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink">
                <MapPin size={14} weight="fill" className="text-accent" />
                {org.city}
              </span>
            ) : null}

            <h1 className="mt-3 font-display text-[38px] leading-[1.05] tracking-tight text-ink">
              {org.name}
            </h1>

            {org.tagline ? (
              <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                {org.tagline}
              </p>
            ) : null}
          </div>

          <div className="relative h-[170px] w-[38%] max-w-[168px] shrink-0 overflow-hidden rounded-[28px] shadow-hero sm:h-[210px]">
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
