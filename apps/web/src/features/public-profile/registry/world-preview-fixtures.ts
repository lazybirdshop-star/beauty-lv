import type { PageDesign } from '@amolie/shared-kernel';

import type { PublicOrganization, PublishedSlot } from '../engine/types';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Фикстура каталога: одна вымышленная мастерская, на которой миры сравниваются
 * между собой.
 *
 * Почему фикстура, а не данные мастера. Каталог отвечает на вопрос «чем миры
 * отличаются друг от друга», и ответ обязан быть одинаковым для всех: мастер
 * без услуг увидела бы семь одинаково пустых миниатюр и не смогла бы выбрать.
 * Живой холст Студии — противоположный случай и работает на настоящих данных
 * (DESIGN_STUDIO.md §4.1).
 *
 * Имя и услуги специально несут кириллицу и латышские диакритики (ā, ē, ī, š,
 * ū, ž) — два места, где модная гарнитура ломается (§5.10), и миниатюра
 * показывает это до выбора, а не после.
 */
const FIXTURE_SERVICES = [
  {
    id: 'fx-1',
    categoryId: null,
    name: 'Стрижка и укладка',
    description: null,
    imageUrl: null,
    durationMinutes: 60,
    priceAmountMinorUnits: 4500,
    priceCurrency: 'EUR',
  },
  {
    id: 'fx-2',
    categoryId: null,
    name: 'Окрашивание «Rudens zelts»',
    description: null,
    imageUrl: null,
    durationMinutes: 120,
    priceAmountMinorUnits: 9000,
    priceCurrency: 'EUR',
  },
  {
    id: 'fx-3',
    categoryId: null,
    name: 'Уход за волосами',
    description: null,
    imageUrl: null,
    durationMinutes: 45,
    priceAmountMinorUnits: 3500,
    priceCurrency: 'EUR',
  },
] as const;

/**
 * Организация-фикстура под конкретный мир: оформление подставляется ключами
 * выбранного пресета, всё остальное общее. Фотографий нет намеренно — миры в
 * каталоге обязаны различаться композицией, а не чужим снимком (§15.4).
 */
export function buildFixtureOrganization(design: PageDesign): PublicOrganization {
  return {
    slug: 'studija',
    name: 'Studija Amolie',
    tagline: 'Причёска и уход · Rīga',
    avatarInitials: 'SA',
    city: 'Rīga',
    address: 'Tērbatas iela 12',
    phone: '+371 20 000 000',
    showPricesSection: true,
    showContactsSection: true,
    defaultLocale: null,
    timeZone: 'Europe/Riga',
    design,
    services: [...FIXTURE_SERVICES],
    serviceCategories: [],
    serviceAddons: [],
  };
}

/**
 * Несколько опубликованных окон в текущем месяце: календарь мира обязан
 * показать заполненную сетку, иначе миниатюра сравнивает пустые состояния.
 *
 * `today` приходит параметром, а не берётся здесь из `new Date()`: миниатюры
 * монтируются только на клиенте (см. `world-thumbnail.tsx`), и явный аргумент
 * держит функцию чистой и тестируемой.
 */
export function buildFixtureSlots(today: Date): PublishedSlot[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* Окна ставятся вперёд от сегодняшнего дня и подрезаются краем месяца —
     календарь открывается на месяце первого окна, и прошлое ему не нужно. */
  const offsets = [1, 2, 4, 7, 9, 12];
  const times = ['10:00', '12:30', '15:00'];

  return offsets
    .map((offset) => dayOfMonth + offset)
    .filter((day) => day <= daysInMonth)
    .flatMap((day, dayIndex) => {
      const date = `${year}-${pad(month + 1)}-${pad(day)}`;
      return times.map((time, timeIndex) => ({
        id: `fx-slot-${date}-${time}`,
        date,
        time,
        iso: `${date}T${time}:00`,
        /* Один занятый слот в ряду: миры рисуют «занято» по-своему, и это
           одно из различий, ради которых каталог существует. */
        status: (dayIndex === 1 && timeIndex === 1 ? 'booked' : 'available') as
          'available' | 'booked',
      }));
    });
}
