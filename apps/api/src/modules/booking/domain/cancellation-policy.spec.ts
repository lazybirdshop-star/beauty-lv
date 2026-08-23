import { STATUSES_LEADING_TO } from './booking-status';
import { clientCancellationDeadline, refuseClientCancellation } from './cancellation-policy';

const VISIT = new Date('2026-09-01T12:00:00.000Z');

/**
 * Правило принадлежит мастеру, и цена ошибки здесь несимметрична: лишний раз
 * не дать отменить — неудобство, лишний раз дать — потерянный час, о котором
 * она узнает, когда клиент не придёт.
 */
describe('политика отмены клиентом', () => {
  describe('clientCancellationDeadline', () => {
    it('без правила мастера срока нет вовсе', () => {
      expect(
        clientCancellationDeadline({ startsAt: VISIT, status: 'confirmed', hours: null }),
      ).toBeNull();
    });

    it('отсчитывает срок назад от начала визита', () => {
      const deadline = clientCancellationDeadline({
        startsAt: VISIT,
        status: 'confirmed',
        hours: 24,
      });

      expect(deadline?.toISOString()).toBe('2026-08-31T12:00:00.000Z');
    });

    it('ноль часов означает «до самого начала»', () => {
      const deadline = clientCancellationDeadline({ startsAt: VISIT, status: 'pending', hours: 0 });

      expect(deadline?.toISOString()).toBe(VISIT.toISOString());
    });

    it.each(['completed', 'no_show', 'cancelled_by_client', 'cancelled_by_master'] as const)(
      'у визита в статусе «%s» срока нет: отменять уже нечего',
      (status) => {
        expect(clientCancellationDeadline({ startsAt: VISIT, status, hours: 24 })).toBeNull();
      },
    );
  });

  describe('refuseClientCancellation', () => {
    it('пропускает, пока срок не вышел', () => {
      const refusal = refuseClientCancellation(
        { startsAt: VISIT, status: 'confirmed', hours: 24 },
        new Date('2026-08-31T11:59:00.000Z'),
      );

      expect(refusal).toBeNull();
    });

    it('отказывает через минуту после срока', () => {
      const refusal = refuseClientCancellation(
        { startsAt: VISIT, status: 'confirmed', hours: 24 },
        new Date('2026-08-31T12:01:00.000Z'),
      );

      expect(refusal).toBe('too_late');
    });

    it('в сам момент срока ещё пропускает — граница на стороне человека', () => {
      const refusal = refuseClientCancellation(
        { startsAt: VISIT, status: 'confirmed', hours: 24 },
        new Date('2026-08-31T12:00:00.000Z'),
      );

      expect(refusal).toBeNull();
    });

    it('без правила мастера отказывает отдельной причиной', () => {
      const refusal = refuseClientCancellation(
        { startsAt: VISIT, status: 'confirmed', hours: null },
        new Date('2026-08-01T00:00:00.000Z'),
      );

      expect(refusal).toBe('disabled');
    });

    it('состоявшийся визит не отменяется даже в срок', () => {
      const refusal = refuseClientCancellation(
        { startsAt: VISIT, status: 'completed', hours: 24 },
        new Date('2026-08-01T00:00:00.000Z'),
      );

      expect(refusal).toBe('not_possible');
    });
  });

  /*
   * Два списка статусов живут в разных файлах и отвечают на разные вопросы —
   * «какой WHERE поставить» и «показывать ли кнопку». Разойтись они не имеют
   * права: расхождение выглядело бы как кнопка, которая всегда отвечает 409.
   */
  it('совпадает с тем, из каких статусов база разрешает отмену клиентом', () => {
    for (const status of STATUSES_LEADING_TO.cancelled_by_client) {
      expect(clientCancellationDeadline({ startsAt: VISIT, status, hours: 24 })).not.toBeNull();
    }
  });
});
