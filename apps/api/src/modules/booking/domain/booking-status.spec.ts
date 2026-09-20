import { STATUSES_LEADING_TO, STATUSES_RELEASING_SLOTS, releasesSlots } from './booking-status';

/**
 * The lifecycle rules, asserted directly rather than through the controller:
 * both of them are decisions this file makes alone, and both were previously
 * only stated in prose.
 */
describe('STATUSES_LEADING_TO', () => {
  it('из завершённой записи выпускает только назад, в подтверждённую', () => {
    // Завершение перестало быть приговором: промах рядом с «Завершить»
    // случается, пока клиент в кресле. Но дорога назад ровно одна — вперёд из
    // завершённой записи по-прежнему не ведёт ничего, и в отмену тоже.
    expect(STATUSES_LEADING_TO.confirmed).toContain('completed');
    for (const [target, from] of Object.entries(STATUSES_LEADING_TO)) {
      if (target === 'confirmed') continue;
      expect(from).not.toContain('completed');
    }
  });

  it('возврат завершённой не освобождает окон — их и не освобождали', () => {
    // Условие безопасности возврата: запись всё это время лежала в частичном
    // уникальном индексе, и статус, на который он не смотрит, её оттуда не
    // выносил. Иначе `confirmed` столкнулся бы с чужой записью на то же окно.
    expect(releasesSlots('completed')).toBe(false);
    expect(releasesSlots('confirmed')).toBe(false);
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
    // И назад в подтверждённый: промах пальцем случается, пока клиент в кресле,
    // и правда о визите тогда — прежний статус, а не досрочно завершённый визит.
    expect(STATUSES_LEADING_TO.confirmed).toContain('no_show');
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
