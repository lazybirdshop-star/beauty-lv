/**
 * Карточка «Завтра» — по артборду `Main.dc.html`.
 *
 * Три строки: время, метка услуги, имя, услуга справа. Не расписание, а ответ
 * на вопрос, который мастер задаёт вечером: во сколько мне завтра приходить и
 * кто первый.
 */
import Link from 'next/link';

import type { Messages } from '@/lib/i18n/messages';

export interface TomorrowEntry {
  id: string;
  time: string;
  clientName: string;
  serviceName: string;
  tone: string;
  href: string;
}

export function TomorrowCard({
  entries,
  date,
  window,
  t,
}: {
  entries: TomorrowEntry[];
  date: string;
  /** «09:30 – 17:30» — от первой записи до конца последней. */
  window: string | null;
  t: Messages;
}) {
  return (
    <div className="card" style={{ padding: '14px 18px 8px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <span className="t-section" style={{ fontSize: 15 }}>
          {t.home.tomorrow}
        </span>
        <span className="t-meta" style={{ textAlign: 'right' }}>
          {window ? `${date} · ${window}` : date}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="t-meta" style={{ padding: '7px 0 10px' }}>
          {t.home.tomorrowEmpty}
        </p>
      ) : (
        entries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            className="row"
            style={{
              gap: 10,
              padding: '7px 0',
              borderTop: '1px solid var(--hair)',
              fontSize: 13.5,
              color: 'var(--ink)',
            }}
          >
            <span className="tnum" style={{ width: 42, fontWeight: 600 }}>
              {entry.time}
            </span>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: entry.tone,
                flex: 'none',
              }}
            />
            <span
              style={{
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.clientName}
            </span>
            <span
              className="t-meta"
              style={{
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '45%',
              }}
            >
              {entry.serviceName}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
