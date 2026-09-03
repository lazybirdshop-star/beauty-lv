/**
 * 06 · Для тех, кто работает один.
 *
 * Календарь дня, список клиентов и услуги — рядом, с выносками по номерам.
 * Выноски пронумерованы, а не подписаны стрелками: стрелка на телефоне
 * указывает мимо, номер работает на любой ширине.
 */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Calendar } from '../components/calendar';
import { Still } from '../components/still';
import { dayAppointments } from '../lib/day';

const COLUMNS = ['elina'] as const;

/** Строка списка клиентов: правая метка — «Сегодня» или «Завтра». */
type ClientRow = {
  initials: string;
  tone: string;
  name: string;
  service: string;
  at?: string;
  visits?: number;
  online?: boolean;
  fresh?: boolean;
  when: 'soloToday' | 'soloTomorrow';
};

const CLIENTS: ClientRow[] = [
  {
    initials: 'KJ',
    tone: '',
    name: 'Kristīne Jansone',
    service: 'Gel manicure',
    at: '09:30',
    visits: 11,
    when: 'soloToday',
  },
  {
    initials: 'DK',
    tone: '',
    name: 'Dana Krūmiņa',
    service: 'Classic manicure',
    at: '11:00',
    visits: 7,
    when: 'soloToday',
  },
  {
    initials: 'IL',
    tone: 'avatar--pink',
    name: 'Ilze Liepa',
    service: 'Lash lift',
    at: '12:30',
    visits: 3,
    when: 'soloToday',
  },
  {
    initials: 'LV',
    tone: 'avatar--pink',
    name: 'Laura Vītola',
    service: 'Gel manicure',
    at: '14:30',
    online: true,
    when: 'soloToday',
  },
  {
    initials: 'AS',
    tone: 'avatar--paper',
    name: 'Anete Sproģe',
    service: 'Lash lift',
    fresh: true,
    when: 'soloTomorrow',
  },
];

const SERVICES = [
  ['Classic manicure', 45, '€25'],
  ['Gel manicure', 75, '€40'],
  ['Brow shaping', 30, '€18'],
] as const;

const MARKERS = [
  { n: 1, x: '8%', y: '14.6%' },
  { n: 2, x: '56%', y: '57%' },
  { n: 3, x: '56%', y: '75%' },
  { n: 4, x: '91%', y: '4.5%' },
] as const;

export function Solo({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="section solo" id="solo" aria-labelledby="solo-title">
      <div className="container">
        <div className="solo__head">
          <div className="solo__intro reveal">
            <p className="eyebrow">{t.soloEyebrow}</p>
            <h2 id="solo-title">
              {t.soloTitle} <em className="serif">{t.soloTitleAccent}</em>
            </h2>
            <p className="lede">{t.soloLede}</p>
          </div>

          <figure className="solo__photo reveal" style={{ '--delay': '120ms' } as CSSProperties}>
            <span className="solo__frame">
              <Still
                src="/landing/solo-nailartist.jpg"
                alt={t.soloPhotoAlt}
                sizes="(max-width: 960px) 100vw, 40vw"
              />
            </span>
            <figcaption>{t.soloPhotoCaption}</figcaption>
          </figure>
        </div>

        <div className="solo__scene">
          <div className="ui solo__ui reveal" role="img" aria-label={t.soloDashAlt}>
            <div className="solo-dash">
              <div className="solo-dash__cal">
                <Calendar
                  start={9}
                  end={17}
                  columns={COLUMNS}
                  appointments={dayAppointments(COLUMNS, 9, 17, [
                    { col: 0, at: '13:30', minutes: 60, free: true },
                    { col: 0, at: '16:00', minutes: 60, free: true },
                  ])}
                  title={t.calToday}
                  date={t.demoDayShort}
                  views={{ day: t.calDay, week: t.calWeek }}
                  freeLabel={t.calFree}
                />
              </div>

              <div className="solo-dash__side">
                <div className="panel">
                  <div className="panel__title">
                    {t.panelClients} <small>128</small>
                  </div>
                  <div className="list">
                    {CLIENTS.map((client) => (
                      <div className="list__row" key={client.name}>
                        <span className={`avatar ${client.tone}`}>{client.initials}</span>
                        <div>
                          <b>{client.name}</b>
                          <small>
                            {client.service} · {client.at ? `${client.at} · ` : ''}
                            {client.online
                              ? t.soloBookedOnline
                              : client.fresh
                                ? t.soloNewClient
                                : t.soloVisits.replace('{count}', String(client.visits))}
                          </small>
                        </div>
                        <span className="r">{t[client.when]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel__title">
                    {t.panelServices} <small>{t.soloServicesActive.replace('{count}', '5')}</small>
                  </div>
                  <div className="list">
                    {SERVICES.map(([name, minutes, price]) => (
                      <div className="list__row" key={name}>
                        <span />
                        <div>
                          <b>{name}</b>
                          <small>
                            {minutes} {t.unitMin}
                          </small>
                        </div>
                        <span className="r">{price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {MARKERS.map((marker) => (
              <span
                className="marker"
                key={marker.n}
                style={{ '--mx': marker.x, '--my': marker.y } as CSSProperties}
                aria-hidden="true"
              >
                {marker.n}
              </span>
            ))}
          </div>

          <ol className="anno-list reveal" style={{ '--delay': '160ms' } as CSSProperties}>
            {[
              [t.soloAnno1Title, t.soloAnno1Body],
              [t.soloAnno2Title, t.soloAnno2Body],
              [t.soloAnno3Title, t.soloAnno3Body],
              [t.soloAnno4Title, t.soloAnno4Body],
            ].map(([title, body], index) => (
              <li className="anno" key={title}>
                <span className="anno__dot">{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
