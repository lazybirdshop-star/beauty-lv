import { STATUSES_LEADING_TO, STATUSES_RELEASING_SLOTS, releasesSlots } from './booking-status';

/**
 * The lifecycle rules, asserted directly rather than through the controller:
 * both of them are decisions this file makes alone, and both were previously
 * only stated in prose.
 */
describe('STATUSES_LEADING_TO', () => {
  it('никуда не выпускает из завершённой записи', () => {
    for (const [target, from] of Object.entries(STATUSES_LEADING_TO)) {
      expect(from).not.toContain('completed');
      expect(target).toBeDefined();
    }
  });

  it('никуда не выпускает из отменённой — отмена окончательна', () => {
    for (const from of Object.values(STATUSES_LEADING_TO)) {
      expect(from).not.toContain('cancelled_by_client');
      expect(from).not.toContain('cancelled_by_master');
    }
  });

  it('позволяет исправить ошибочный no_show', () => {
    // Суждение, вынесенное в моменте, не должно быть приговором.
    expect(STATUSES_LEADING_TO.completed).toContain('no_show');
    expect(STATUSES_LEADING_TO.cancelled_by_master).toContain('no_show');
  });

  it('не даёт вернуться в pending', () => {
    expect(STATUSES_LEADING_TO.pending).toEqual([]);
  });
});

describe('releasesSlots', () => {
  it('освобождает окна на обеих отменах', () => {
    // Ровно предикат частичного уникального индекса bookings: разойтись с ним
    // значит потерять время мастера в календаре, оставив его свободным в базе.
    expect(releasesSlots('cancelled_by_client')).toBe(true);
    expect(releasesSlots('cancelled_by_master')).toBe(true);
    expect(STATUSES_RELEASING_SLOTS).toHaveLength(2);
  });

  it('не освобождает окна на no_show — час всё равно потрачен', () => {
    expect(releasesSlots('no_show')).toBe(false);
  });

  it('не освобождает окна на живых статусах', () => {
    expect(releasesSlots('pending')).toBe(false);
    expect(releasesSlots('confirmed')).toBe(false);
    expect(releasesSlots('completed')).toBe(false);
  });
});
