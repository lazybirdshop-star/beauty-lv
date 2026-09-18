import { describe, expect, it } from 'vitest';

import { collapseRepeats, type ActivityLogEntry } from './activity-log';

function entry(id: string, action: string, actorName = 'Rasa'): ActivityLogEntry {
  return {
    id,
    action,
    entityType: 'organization',
    entityId: 'org',
    createdAt: '2026-09-17T10:00:00.000Z',
    actorName,
    viaSupport: false,
    severity: 'info',
  };
}

describe('collapseRepeats', () => {
  it('склеивает подряд идущие одинаковые действия одного человека', () => {
    const rows = collapseRepeats([
      entry('1', 'organization.profile_updated'),
      entry('2', 'organization.profile_updated'),
      entry('3', 'organization.profile_updated'),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.count).toBe(3);
    expect(rows[0]!.entry.id).toBe('1');
  });

  it('не склеивает через другое действие и через другого человека', () => {
    const rows = collapseRepeats([
      entry('1', 'organization.profile_updated'),
      entry('2', 'client.blocked'),
      entry('3', 'organization.profile_updated'),
      entry('4', 'organization.profile_updated', 'Ieva'),
    ]);
    expect(rows.map((row) => row.count)).toEqual([1, 1, 1, 1]);
  });
});
