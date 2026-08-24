/**
 * Как платформа впускает новых мастеров.
 *
 * `moderated` — человек оставляет заявку, администратор решает. `open` —
 * аккаунт создаётся сразу, как в любом обычном продукте.
 *
 * Это настройка (`platform_settings.registration_mode`), а не константа
 * сборки: переход к открытой регистрации — решение владельца продукта,
 * принимаемое в тот день, когда закончатся тесты, и оно не должно требовать
 * деплоя. Умолчание — модерация: платформа, забывшая настройку, обязана
 * впускать осторожнее, а не свободнее.
 */
export const REGISTRATION_MODES = ['moderated', 'open'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const DEFAULT_REGISTRATION_MODE: RegistrationMode = 'moderated';

export function resolveRegistrationMode(value: string | undefined | null): RegistrationMode {
  return (REGISTRATION_MODES as readonly string[]).includes(value ?? '')
    ? (value as RegistrationMode)
    : DEFAULT_REGISTRATION_MODE;
}

/**
 * Судьба заявки. Промежуточного «в работе» нет намеренно: заявку либо
 * одобрили, либо отклонили, и любое третье состояние — это очередь, в
 * которой заявка стоит вечно, потому что кто-то её «взял».
 */
export const REGISTRATION_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RegistrationRequestStatus = (typeof REGISTRATION_REQUEST_STATUSES)[number];
