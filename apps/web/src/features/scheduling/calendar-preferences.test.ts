import { describe, expect, it } from 'vitest';

import { parseCalendarPreferences } from './calendar-preferences';

describe('parseCalendarPreferences', () => {
  it('пустое хранилище — никаких привычек', () => {
    expect(parseCalendarPreferences(null)).toEqual({});
  });

  it('читает вид, фильтр и человека', () => {
    expect(
      parseCalendarPreferences(
        JSON.stringify({ view: 'team', visible: ['a', 'b'], personId: 'a' }),
      ),
    ).toEqual({ view: 'team', visible: ['a', 'b'], personId: 'a' });
  });

  it('мусор в хранилище не роняет календарь', () => {
    expect(parseCalendarPreferences('{not json')).toEqual({});
    expect(parseCalendarPreferences('"team"')).toEqual({});
    expect(
      parseCalendarPreferences(JSON.stringify({ view: 'month', visible: [1, 2], personId: 3 })),
    ).toEqual({});
  });
});
