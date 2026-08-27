import type { ServiceRow } from '../../../shared/database/schema/services';

import { visitDurationMinutes } from './visit-duration';

function service(durationMinutes: number, bufferAfterMinutes = 0): ServiceRow {
  return { durationMinutes, bufferAfterMinutes } as ServiceRow;
}

/**
 * Сколько времени визит занимает у мастера — и, следом, сколько окон под ним
 * будет занято: `createBooking` берёт все окна интервала `[начало, конец)`.
 *
 * Ровно этим правилом доп. услуга удлиняет запись. Доп — это обычная услуга
 * (`service_addons` лишь граф предложений, `addon_service_id` ссылается на
 * `services`), поэтому она приходит в том же `serviceIds` и попадает сюда
 * наравне с основной.
 */
describe('visitDurationMinutes', () => {
  it('одна услуга — её время плюс её уборка', () => {
    expect(visitDurationMinutes([service(60, 10)])).toBe(70);
  });

  it('услуги идут подряд', () => {
    expect(visitDurationMinutes([service(60), service(30)])).toBe(90);
  });

  it('доп. услуга удлиняет визит на своё время', () => {
    const withoutAddon = visitDurationMinutes([service(60, 10)]);
    const withAddon = visitDurationMinutes([service(60, 10), service(30, 5)]);

    // Из-за этого визит перестаёт помещаться в одно окно и занимает следующее.
    expect(withAddon).toBe(withoutAddon + 30);
  });

  it('уборка берётся одна — самая длинная, а не сумма', () => {
    // Буфер это подготовка и уборка после работы, а не пауза между стрижкой
    // и бородой: клиент, взявший три услуги, получает её один раз в конце.
    expect(visitDurationMinutes([service(60, 10), service(30, 20)])).toBe(110);
  });

  it('без буферов — чистая сумма', () => {
    expect(visitDurationMinutes([service(45), service(15), service(30)])).toBe(90);
  });

  it('порядок услуг ничего не меняет — корзина это множество', () => {
    const a = visitDurationMinutes([service(60, 10), service(30, 20)]);
    const b = visitDurationMinutes([service(30, 20), service(60, 10)]);

    expect(a).toBe(b);
  });
});
