import { Clock, InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import type { PublicOrganization } from '../types';

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function ContactsCard({ org }: { org: PublicOrganization }) {
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className="flex flex-col gap-3 px-5 pb-10 pt-2">
      <h2 className="mb-1 text-lg font-semibold text-ink">Контакты</h2>

      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-3 rounded-[20px] border border-border bg-bg-raised px-4 py-4"
      >
        <MapPin size={20} className="mt-0.5 shrink-0 text-accent" />
        <span>
          <span className="block text-[15px] font-semibold text-ink">{org.city}</span>
          <span className="block text-sm text-ink-soft">{org.address}</span>
        </span>
      </a>

      <a
        href={telHref}
        className="flex items-center gap-3 rounded-[20px] border border-border bg-bg-raised px-4 py-4"
      >
        <Phone size={20} className="shrink-0 text-accent" />
        <span className="font-mono text-[15px] font-semibold text-ink">{org.phone}</span>
      </a>

      {org.instagram ? (
        <a
          href={`https://instagram.com/${org.instagram}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-[20px] border border-border bg-bg-raised px-4 py-4"
        >
          <InstagramLogo size={20} className="shrink-0 text-accent" />
          <span className="text-[15px] font-semibold text-ink">@{org.instagram}</span>
        </a>
      ) : null}

      <div className="rounded-[20px] border border-border bg-bg-raised px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Clock size={20} className="text-accent" />
          <span className="text-[15px] font-semibold text-ink">Часы работы</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const entry = org.workingHours.find((item) => item.weekday === weekday);
            return (
              <li key={label} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{label}</span>
                <span className={entry ? 'font-mono text-ink' : 'text-ink-faint'}>
                  {entry ? `${entry.start}-${entry.end}` : 'выходной'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
