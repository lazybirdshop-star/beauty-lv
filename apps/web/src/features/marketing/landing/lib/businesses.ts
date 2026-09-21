/**
 * Три заведения на одной странице записи.
 *
 * Одна система и три очень разных дела: соло-мастер по ногтям, салон в
 * Старой Риге и барбершоп. Существуют они ради одного довода — страница
 * подстраивается под заведение, а не заведение под страницу.
 *
 * Вывески и имена мастеров не переводятся — это имена. Услуги и подпись
 * под вывеской хранятся ключами словаря и переводятся вместе со страницей:
 * прайс мастер пишет на языке своих клиентов.
 */
import type { Messages } from '@/lib/i18n/messages';

import type { ServiceKey } from './day';

export type Business = {
  slug: string;
  name: string;
  meta: Extract<keyof Messages['marketing'], `biz${string}`>;
  initials: string;
  /** Файл в /public/landing — обложка страницы записи. */
  cover: string;
  team: { initials: string; name: string; tone: string; on?: boolean }[] | null;
  services: {
    name: ServiceKey;
    minutes: number | null;
    price: string;
    free?: boolean;
    on?: boolean;
  }[];
  times: string[];
  /** Выбранное время и индексы занятых. */
  selected: string;
  taken: number[];
  /** Сводка записи: услуга и — в заведении с командой — мастер. */
  summary: { service: ServiceKey; person?: string };
  price: string;
};

export type BusinessKey = 'nara' | 'ozola' | 'form';

export const BUSINESSES: Record<BusinessKey, Business> = {
  nara: {
    slug: 'nailsbyalise',
    name: 'Nails by Alise',
    meta: 'bizAliseMeta',
    initials: 'NA',
    cover: '/landing/hero-studio.jpg',
    team: null,
    services: [
      { name: 'svcClassicManicure', minutes: 45, price: '€25' },
      { name: 'svcGelManicure', minutes: 75, price: '€40', on: true },
      { name: 'svcGelRemoval', minutes: 20, price: '€10' },
      { name: 'svcNailArt', minutes: null, price: '€2' },
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
    summary: { service: 'svcGelManicure' },
    price: '€40',
  },
  ozola: {
    slug: 'atelierozola',
    name: 'Atelier Ozola',
    meta: 'bizOzolaMeta',
    initials: 'AO',
    cover: '/landing/cover-salon.jpg',
    team: [
      { initials: 'AL', name: 'Anna', tone: '' },
      { initials: 'EO', name: 'Elīna', tone: '', on: true },
      { initials: 'MK', name: 'Marta', tone: 'avatar--pink' },
      { initials: 'JR', name: 'Jānis', tone: '' },
    ],
    services: [
      { name: 'svcHaircutStyle', minutes: 60, price: '€55', on: true },
      { name: 'svcColorConsult', minutes: 20, price: '', free: true },
      { name: 'svcBalayage', minutes: 150, price: '€160' },
      { name: 'svcBlowDry', minutes: 40, price: '€30' },
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
    summary: { service: 'svcHaircutStyle', person: 'Elīna' },
    price: '€55',
  },
  form: {
    slug: 'formbarbers',
    name: 'Form Barbers',
    meta: 'bizFormMeta',
    initials: 'FB',
    cover: '/landing/cover-barber.jpg',
    team: [
      { initials: 'TL', name: 'Toms', tone: 'avatar--ink', on: true },
      { initials: 'JR', name: 'Jānis', tone: 'avatar--pink' },
      { initials: 'KO', name: 'Kārlis', tone: '' },
    ],
    services: [
      { name: 'svcHaircut', minutes: 45, price: '€35' },
      { name: 'svcBeardTrim', minutes: 30, price: '€20' },
      { name: 'svcSkinFade', minutes: 50, price: '€30', on: true },
      { name: 'svcHaircutBeard', minutes: 75, price: '€50' },
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
    summary: { service: 'svcSkinFade', person: 'Toms' },
    price: '€30',
  },
};

export const BUSINESS_KEYS: readonly BusinessKey[] = ['nara', 'ozola', 'form'];
