import { newBookingMessage, type NewBookingFacts } from './push-messages';

function makeFacts(overrides: Partial<NewBookingFacts> = {}): NewBookingFacts {
  return {
    clientName: 'Анна',
    /* 11:00 UTC — это 14:00 в Риге летом. Момент выбран так, чтобы час в
       строке не совпадал с часом UTC: иначе тест прошёл бы и без пояса. */
    startsAt: new Date('2026-09-01T11:00:00.000Z'),
    serviceNames: ['Маникюр'],
    timeZone: 'Europe/Riga',
    organizationSlug: 'anna',
    bookingId: 'booking-1',
    ...overrides,
  };
}

describe('newBookingMessage', () => {
  it('называет время в поясе салона, а не сервера', () => {
    const message = newBookingMessage('ru', makeFacts());

    expect(message.body).toContain('14:00');
    expect(message.body).toContain('Анна');
    expect(message.body).toContain('Маникюр');
  });

  it('говорит на языке мастера', () => {
    expect(newBookingMessage('ru', makeFacts()).title).toBe('Новая запись');
    expect(newBookingMessage('lv', makeFacts()).title).toBe('Jauns pieraksts');
    expect(newBookingMessage('en', makeFacts()).title).toBe('New booking');
  });

  it('сворачивает длинный список услуг в счётчик, а не обрывает его', () => {
    const message = newBookingMessage(
      'ru',
      makeFacts({ serviceNames: ['Маникюр', 'Педикюр', 'Покрытие', 'Дизайн'] }),
    );

    expect(message.body).toContain('Маникюр, Педикюр +2');
    expect(message.body).not.toContain('Дизайн');
  });

  it('ведёт в записи мастера и различает записи между собой', () => {
    const first = newBookingMessage('ru', makeFacts({ bookingId: 'one' }));
    const second = newBookingMessage('ru', makeFacts({ bookingId: 'two' }));

    expect(first.url).toBe('/anna/dashboard/bookings');
    // Общий тег заменил бы одно уведомление другим, и первая запись пропала бы.
    expect(first.tag).not.toBe(second.tag);
  });
});
