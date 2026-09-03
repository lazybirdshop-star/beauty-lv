/**
 * Три заведения на одной странице записи.
 *
 * Одна система и три очень разных дела: соло-мастер по ногтям, салон в
 * Старой Риге и барбершоп. Существуют они ради одного довода — страница
 * подстраивается под заведение, а не заведение под страницу.
 *
 * Названия, услуги и имена мастеров не переводятся: это слова вымышленных
 * владельцев, а не интерфейс. Переводится всё, что рисует продукт, — и
 * единственное такое слово здесь бесплатная консультация, поэтому цена
 * умеет быть ключом словаря.
 */
export type Business = {
  slug: string;
  name: string;
  meta: string;
  initials: string;
  /** Файл в /public/landing — обложка страницы записи. */
  cover: string;
  /** Тон света за макетом: у салона он холоднее, у барбершопа лиловее. */
  mood: string;
  team: { initials: string; name: string; tone: string; on?: boolean }[] | null;
  services: { name: string; minutes: number | null; price: string; free?: boolean; on?: boolean }[];
  times: string[];
  /** Выбранное время и индексы занятых. */
  selected: string;
  taken: number[];
  summary: string;
  price: string;
};

export type BusinessKey = 'nara' | 'ozola' | 'form';

export const BUSINESSES: Record<BusinessKey, Business> = {
  nara: {
    slug: 'nailsbyalise',
    name: 'Nails by Alise',
    meta: 'Nail artist — Rīga',
    initials: 'NA',
    cover: '/landing/solo-nailartist.jpg',
    mood: 'radial-gradient(50% 50% at 50% 50%, #e7d6c4, transparent 70%)',
    team: null,
    services: [
      { name: 'Classic manicure', minutes: 45, price: '€25' },
      { name: 'Gel manicure', minutes: 75, price: '€40', on: true },
      { name: 'Gel removal', minutes: 20, price: '€10' },
      { name: 'Nail art', minutes: null, price: '€2' },
    ],
    times: [
      '09:15',
      '10:30',
      '11:45',
      '13:00',
      '14:30',
      '15:45',
      '17:00',
      '18:15',
      '19:30',
      '20:45',
    ],
    selected: '14:30',
    taken: [0, 2, 7],
    summary: 'Gel manicure',
    price: '€40',
  },
  ozola: {
    slug: 'atelier-ozola',
    name: 'Atelier Ozola',
    meta: 'Hair salon — Rīga, Vecrīga',
    initials: 'AO',
    cover: '/landing/cover-salon.jpg',
    mood: 'radial-gradient(50% 50% at 50% 50%, #cfc5bd, transparent 70%)',
    team: [
      { initials: 'AL', name: 'Anna', tone: '' },
      { initials: 'EO', name: 'Elīna', tone: '', on: true },
      { initials: 'MK', name: 'Marta', tone: 'avatar--pink' },
      { initials: 'JR', name: 'Jānis', tone: '' },
    ],
    services: [
      { name: 'Haircut & styling', minutes: 60, price: '€55', on: true },
      { name: 'Color consultation', minutes: 20, price: '', free: true },
      { name: 'Balayage', minutes: 150, price: '€160' },
      { name: 'Blow-dry', minutes: 40, price: '€30' },
    ],
    times: [
      '09:00',
      '10:15',
      '11:30',
      '12:45',
      '14:00',
      '15:15',
      '16:30',
      '17:45',
      '19:00',
      '20:15',
    ],
    selected: '11:30',
    taken: [1, 4, 5, 9],
    summary: 'Haircut & styling · Elīna',
    price: '€55',
  },
  form: {
    slug: 'formbarbers',
    name: 'Form Barbers',
    meta: 'Barbershop — Rīga, Miera iela',
    initials: 'FB',
    cover: '/landing/cover-barber.jpg',
    mood: 'radial-gradient(50% 50% at 50% 50%, #b9b3c9, transparent 70%)',
    team: [
      { initials: 'TL', name: 'Toms', tone: 'avatar--ink', on: true },
      { initials: 'JR', name: 'Jānis', tone: 'avatar--pink' },
      { initials: 'KO', name: 'Kārlis', tone: '' },
    ],
    services: [
      { name: 'Haircut', minutes: 45, price: '€35' },
      { name: 'Beard trim', minutes: 30, price: '€20' },
      { name: 'Skin fade', minutes: 50, price: '€30', on: true },
      { name: 'Haircut + beard', minutes: 75, price: '€50' },
    ],
    times: [
      '09:00',
      '09:50',
      '10:40',
      '11:30',
      '12:20',
      '13:10',
      '14:00',
      '14:50',
      '15:40',
      '16:30',
    ],
    selected: '10:40',
    taken: [0, 3, 6, 7],
    summary: 'Skin fade · Toms',
    price: '€30',
  },
};

export const BUSINESS_KEYS: readonly BusinessKey[] = ['nara', 'ozola', 'form'];
