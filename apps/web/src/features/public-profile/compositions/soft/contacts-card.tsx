'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';

import type { PublicOrganization } from '../../engine/types';

const ROW_CLASS =
  'press flex items-center gap-3 rounded-[var(--card-radius)] bg-bg-sunken/70 px-4 py-4 hover:bg-bg-sunken';

// `grid-cols-1` for the same reason as the service list: an implicit `auto`
// track sizes to its content and a flex row can ask for far more than the
// container. These rows happen not to overflow today, but only because none of
// them carries a `flex-1`; the explicit track makes that independent of luck.
const SECTION_CLASS = 'grid grid-cols-1 gap-2 px-5 pb-12 pt-4 lg:grid-cols-2 lg:px-7';

const ICON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent';

export function ContactsCard({ org }: { org: PublicOrganization }) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className={SECTION_CLASS}>
      <h2 className="mb-2 font-display text-[22px] leading-none text-ink lg:col-span-2">
        {t.publicPage.contacts}
      </h2>

      <a href={mapsHref} target="_blank" rel="noreferrer" className={ROW_CLASS}>
        <span className={ICON_CLASS}>
          <MapPin size={18} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-ink">{org.city}</span>
          <span className="block truncate text-sm text-ink-soft">{org.address}</span>
        </span>
      </a>

      <a href={telHref} className={ROW_CLASS}>
        <span className={ICON_CLASS}>
          <Phone size={18} weight="fill" />
        </span>
        {/* Tabular figures keep the digits aligned without pulling in a
            monospace face the master never chose — mono was the one thing on
            the page that ignored her font. */}
        <span className="text-[15px] font-semibold tabular-nums text-ink">{org.phone}</span>
      </a>

      {org.instagram ? (
        <a
          href={`https://instagram.com/${org.instagram}`}
          target="_blank"
          rel="noreferrer"
          className={ROW_CLASS}
        >
          <span className={ICON_CLASS}>
            <InstagramLogo size={18} />
          </span>
          <span className="text-[15px] font-semibold text-ink">@{org.instagram}</span>
        </a>
      ) : null}
    </section>
  );
}
