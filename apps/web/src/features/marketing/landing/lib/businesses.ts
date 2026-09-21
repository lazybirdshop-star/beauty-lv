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
  /** Кто записывается — у каждого заведения свой клиент. */
  client: string;
  /**
   * Выбранное время и индексы занятых. Витрина живёт в тот же вторник,
   * 14:02, что и вся страница, поэтому окна — только после двух.
   */
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
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
    ],
    client: 'Evija Kalna',
    selected: '16:00',
    taken: [0, 2, 5],
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
      { initials: 'IO', name: 'Inese', tone: '' },
      { initials: 'DV', name: 'Dace', tone: '', on: true },
      { initials: 'LK', name: 'Laima', tone: 'avatar--pink' },
      { initials: 'KB', name: 'Kristaps', tone: '' },
    ],
    services: [
      { name: 'svcHaircutStyle', minutes: 60, price: '€55', on: true },
      { name: 'svcColorConsult', minutes: 20, price: '', free: true },
      { name: 'svcBalayage', minutes: 150, price: '€160' },
      { name: 'svcBlowDry', minutes: 40, price: '€30' },
    ],
    times: [
      '14:15',
      '14:45',
      '15:15',
      '15:45',
      '16:15',
      '16:45',
      '17:15',
      '17:45',
      '18:15',
      '18:45',
    ],
    client: 'Līva Ozoliņa',
    selected: '17:15',
    taken: [1, 4, 8],
    summary: { service: 'svcHaircutStyle', person: 'Dace' },
    price: '€55',
  },
  form: {
    slug: 'formbarbers',
    name: 'Form Barbers',
    meta: 'bizFormMeta',
    initials: 'FB',
    cover: '/landing/cover-barber.jpg',
    team: [
      { initials: 'AZ', name: 'Artūrs', tone: 'avatar--ink', on: true },
      { initials: 'EL', name: 'Edgars', tone: 'avatar--pink' },
      { initials: 'KO', name: 'Kārlis', tone: '' },
    ],
    services: [
      { name: 'svcHaircut', minutes: 45, price: '€35' },
      { name: 'svcBeardTrim', minutes: 30, price: '€20' },
      { name: 'svcSkinFade', minutes: 50, price: '€30', on: true },
      { name: 'svcHaircutBeard', minutes: 75, price: '€50' },
    ],
    times: [
      '14:20',
      '14:40',
      '15:00',
      '15:20',
      '15:40',
      '16:00',
      '16:20',
      '16:40',
      '17:00',
      '17:20',
    ],
    client: 'Mārcis Liepa',
    selected: '15:00',
    taken: [0, 3, 6, 7],
    summary: { service: 'svcSkinFade', person: 'Artūrs' },
    price: '€30',
  },
};

export const BUSINESS_KEYS: readonly BusinessKey[] = ['nara', 'ozola', 'form'];
