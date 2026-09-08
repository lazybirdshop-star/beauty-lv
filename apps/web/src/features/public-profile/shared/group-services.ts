import type { PublicService, PublicServiceCategory } from '../engine/types';

export interface ServiceGroup {
  id: string;
  /** Пустое имя — единственная группа: заголовок над всем списком не нужен. */
  name: string;
  services: PublicService[];
}

/**
 * Разделы прайса на публичной странице.
 *
 * Одна функция на все шесть миров. Копия жила в каждом из них дословно — и
 * ровно до первой правки: «группировать по категориям» пришлось бы вносить
 * шесть раз, а разойтись они успели бы раньше.
 *
 * Услуги, чья категория скрыта или удалена, не исчезают: они попадают в
 * «Другие услуги». Прайс, молча теряющий строку из-за настройки, которую
 * мастер меняла в другом разделе, — худший вид пропажи.
 */
export function groupServices(
  services: PublicService[],
  categories: PublicServiceCategory[],
  otherLabel: string,
  /** Мастер может выключить разделы — тогда клиент видит один общий список. */
  grouped = true,
): ServiceGroup[] {
  if (!grouped || categories.length === 0) {
    return services.length > 0 ? [{ id: 'all', name: '', services }] : [];
  }

  const groups: ServiceGroup[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    services: services.filter((service) => service.categoryId === category.id),
  }));

  const known = new Set(categories.map((category) => category.id));
  const rest = services.filter((service) => !service.categoryId || !known.has(service.categoryId));
  if (rest.length > 0) {
    groups.push({ id: 'rest', name: otherLabel, services: rest });
  }

  return groups.filter((group) => group.services.length > 0);
}
