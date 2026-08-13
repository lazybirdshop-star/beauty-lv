'use client';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { ContactsSectionProps } from '../../contracts/sections';

import { cascade, FOCUS_RING, HEADING_CLASS } from './ui';

/* Строка справочника — тот же `.srv`, что и в прайсе: мир не заводит для
   контактов второго объекта, потому что это тот же список. */
const ROW_CLASS = `aura-veil aura-list-item aura-action flex h-full items-center gap-3.5 px-5 py-[18px] text-left lg:rounded-[var(--card-radius)] ${FOCUS_RING}`;

/**
 * Контакты мира AURA (`aura.html`, вид `contacts`): адрес, телефон,
 * Instagram — три строки одного стеклянного листа.
 *
 * Каждая строка открывается: карта, звонок, профиль; поэтому каждая и есть
 * ссылка целиком, а не текст с крохотным якорем внутри. На развороте лист
 * расходится в сетку карточек тем же правилом, что и прайс.
 */
export function ContactsCard({ org }: ContactsSectionProps) {
  const t = useT();
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(org.address)}`;
  const telHref = `tel:${org.phone.replace(/\s+/g, '')}`;

  return (
    <section className="pt-2">
      <div className="anim-aura-rise flex items-baseline justify-between px-0.5 pb-3 pt-8">
        <h2 className={HEADING_CLASS}>{t.publicPage.contacts}</h2>
      </div>

      <ul
        className="aura-veil aura-list anim-aura-rise overflow-hidden rounded-[var(--panel-radius)] lg:grid lg:grid-cols-2 lg:gap-3.5 lg:overflow-visible"
        style={cascade(1)}
      >
        <li className="min-w-0 border-border [&+li]:border-t lg:col-span-2 lg:[&+li]:border-t-0">
          <a href={mapsHref} target="_blank" rel="noreferrer noopener" className={ROW_CLASS}>
            <Dot color="#D9A0AE" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-medium leading-snug tracking-[-0.01em] text-ink">
                {[org.city, org.address].filter(Boolean).join(', ')}
              </span>
              <span className="mt-1 block text-[11.5px] font-light text-ink-soft">
                {t.publicPage.addressLabel}
              </span>
            </span>
            <Arrow />
          </a>
        </li>

        <li className="min-w-0 border-border [&+li]:border-t lg:[&+li]:border-t-0">
          <a href={telHref} className={ROW_CLASS}>
            <Dot color="#B9A8E3" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-medium tabular-nums tracking-[-0.01em] text-ink">
                {org.phone}
              </span>
              <span className="mt-1 block text-[11.5px] font-light text-ink-soft">
                {t.publicPage.contactLabel}
              </span>
            </span>
            <Arrow />
          </a>
        </li>

        {org.instagram ? (
          <li className="min-w-0 border-border [&+li]:border-t lg:[&+li]:border-t-0">
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={ROW_CLASS}
            >
              <Dot color="#A8C8E8" />
              <span className="min-w-0 flex-1">
                <span className="block break-all text-[14.5px] font-medium tracking-[-0.01em] text-ink">
                  @{org.instagram}
                </span>
                <span className="mt-1 block text-[11.5px] font-light text-ink-soft">Instagram</span>
              </span>
              <Arrow />
            </a>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** Светящаяся точка мира — маркер строки, ничего не кодирует. */
function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: color, boxShadow: `0 0 12px ${color}` }}
    />
  );
}

function Arrow() {
  return (
    <span aria-hidden="true" className={cn('shrink-0 font-light text-ink-faint')}>
      →
    </span>
  );
}
