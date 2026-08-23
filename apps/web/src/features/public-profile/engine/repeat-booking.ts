import type { PublicService } from './types';

/** Параметр адреса, которым кабинет клиента просит повторить прошлый визит. */
export const REPEAT_SERVICES_PARAM = 'services';

/**
 * Что из просимого мастер действительно предлагает сегодня.
 *
 * Между прошлым визитом и повтором проходят недели: услугу переименовывают,
 * убирают из прайса, заводят заново под другим идентификатором. Поэтому
 * список из адреса — не команда, а просьба: страница отвечает на неё тем, что
 * у неё есть, и молча опускает остальное. Открыть корзину с услугой, которой
 * в каталоге нет, значило бы показать цену, которую никто не назначал.
 *
 * Порядок берётся у каталога, а не у адреса: корзина должна выглядеть так же,
 * как если бы человек собрал её руками. Повторы схлопываются — корзина это
 * множество, ровно как и на сервере.
 */
export function requestedServiceIds(
  param: string | null | undefined,
  services: PublicService[],
): string[] {
  if (!param) return [];

  const asked = new Set(
    param
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (asked.size === 0) return [];

  return services.filter((service) => asked.has(service.id)).map((service) => service.id);
}
