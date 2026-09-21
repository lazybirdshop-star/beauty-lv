import {
  DEFAULT_REGISTRATION_MODE,
  resolveRegistrationMode,
  type RegistrationMode,
} from '@amolie/shared-kernel';
import { unstable_cache } from 'next/cache';

import { publicApiFetch, serverApiFetch } from '@/lib/server-api';

/**
 * Как платформа впускает сегодня — одно чтение на два экрана.
 *
 * Спрашивают его экран регистрации и лендинг, и оба обязаны сказать одно и
 * то же: кнопка «Присоединиться» на главной, открывающая форму заявки, —
 * обещание, нарушенное на первом клике.
 *
 * Недоступный API не должен обещать открытую регистрацию, поэтому при любой
 * ошибке ответ — умолчание платформы, то есть модерация.
 */

const MODE_PATH = '/auth/registration-mode';

/**
 * Лендингу хватает минуты: переключение режима — решение владельца раз в
 * жизни продукта, а главная — самая посещаемая страница, и ходить за ним в
 * API на каждую отрисовку значило бы добавить перелёт до Fly к первому байту
 * каждого посетителя.
 */
export const LANDING_MODE_REVALIDATE_SECONDS = 60;

const cachedMode = unstable_cache(
  async () => (await publicApiFetch<{ mode: string }>(MODE_PATH)).mode,
  ['registration-mode'],
  { revalidate: LANDING_MODE_REVALIDATE_SECONDS },
);

/** Для лендинга: из кэша, не старше минуты. */
export async function landingRegistrationMode(): Promise<RegistrationMode> {
  try {
    return resolveRegistrationMode(await cachedMode());
  } catch {
    return DEFAULT_REGISTRATION_MODE;
  }
}

/**
 * Для экрана регистрации: живое чтение. Форма, которая называется «Заявка»,
 * когда аккаунт уже заводится мгновенно, — та же неправда, только на шаг
 * позже, и минута кэша здесь не нужна: экран открывают редко.
 */
export async function liveRegistrationMode(): Promise<RegistrationMode> {
  try {
    return resolveRegistrationMode((await serverApiFetch<{ mode: string }>(MODE_PATH)).mode);
  } catch {
    return DEFAULT_REGISTRATION_MODE;
  }
}
