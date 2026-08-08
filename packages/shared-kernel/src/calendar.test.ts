import { describe, expect, it } from 'vitest';

import { buildCalendarEvent, utf8ByteLength } from './calendar.js';

const BASE = {
  uid: 'booking-1@amolie.com',
  startsAt: new Date('2026-08-05T10:45:00.000Z'),
  endsAt: new Date('2026-08-05T11:25:00.000Z'),
  title: 'Маникюр',
};

const NOW = new Date('2026-08-01T09:00:00.000Z');

function lines(ics: string): string[] {
  return ics.split('\r\n');
}

describe('buildCalendarEvent', () => {
  it('пишет времена в UTC без разделителей', () => {
    const ics = buildCalendarEvent(BASE, NOW);
    expect(lines(ics)).toContain('DTSTART:20260805T104500Z');
    expect(lines(ics)).toContain('DTEND:20260805T112500Z');
    expect(lines(ics)).toContain('DTSTAMP:20260801T090000Z');
  });

  it('разделяет строки по CRLF и закрывает файл переводом строки', () => {
    const ics = buildCalendarEvent(BASE, NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.includes('\n\n')).toBe(false);
  });

  /*
   * The case that actually breaks .ics files in this product: a master is free
   * to name a service «Маникюр, дизайн» or give an address with a comma, and an
   * unescaped one ends the property early.
   */
  it('экранирует запятые, точки с запятой, обратные слэши и переводы строк', () => {
    const ics = buildCalendarEvent(
      {
        ...BASE,
        title: 'Маникюр, дизайн; френч',
        location: 'Brīvības iela 12, Rīga',
        description: 'Первая строка\nвторая \\ третья',
      },
      NOW,
    );

    expect(ics).toContain('SUMMARY:Маникюр\\, дизайн\\; френч');
    expect(ics).toContain('LOCATION:Brīvības iela 12\\, Rīga');
    expect(ics).toContain('Первая строка\\nвторая \\\\ третья');
  });

  it('складывает длинные строки по байтам, а не по символам', () => {
    // Кириллица — два байта на символ: счёт по символам пропустил бы строку
    // почти вдвое длиннее лимита.
    const ics = buildCalendarEvent({ ...BASE, title: 'Маникюр классический '.repeat(6) }, NOW);

    for (const line of lines(ics)) {
      expect(utf8ByteLength(line)).toBeLessThanOrEqual(75);
    }
    // Продолжения помечены ведущим пробелом — иначе это уже другое свойство.
    expect(ics).toContain('\r\n ');
  });

  it('добавляет будильник только когда его попросили', () => {
    expect(buildCalendarEvent(BASE, NOW)).not.toContain('BEGIN:VALARM');

    const withAlarm = buildCalendarEvent({ ...BASE, reminderMinutesBefore: 120 }, NOW);
    expect(withAlarm).toContain('BEGIN:VALARM');
    expect(withAlarm).toContain('TRIGGER:-PT120M');
  });

  it('не объявляет METHOD:REQUEST — визит не требует ответа', () => {
    expect(buildCalendarEvent(BASE, NOW)).toContain('METHOD:PUBLISH');
  });
});
