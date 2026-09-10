import type { ServiceRow } from '../../../shared/database/schema/services';

/** Условия мастера по одной услуге: `null` в поле означает «как в прайсе». */
export interface StaffTerms {
  serviceId: string;
  priceOverrideAmount: number | null;
  durationOverrideMinutes: number | null;
}

/**
 * Услуги на условиях того, кто их будет делать (SALON.md §4.5).
 *
 * Возвращается тот же `ServiceRow`, а не новый тип, и это главное решение
 * этого файла. Всё, что стоит дальше по течению — счёт длительности визита,
 * подбор окон под неё, снимки цены и длительности в позициях записи, —
 * написано под `ServiceRow` и не должно узнать о существовании переопределений
 * вовсе. Подмена происходит один раз, в одной точке, до того как визит начнёт
 * собираться.
 *
 * Валюта не переопределяется: она у организации одна, и мастер с собственной
 * валютой в общем прайсе — это не цена, а другая бухгалтерия.
 */
export function applyStaffTerms(services: ServiceRow[], terms: StaffTerms[]): ServiceRow[] {
  if (!terms.length) return services;
  const byService = new Map(terms.map((term) => [term.serviceId, term]));

  return services.map((service) => {
    const term = byService.get(service.id);
    if (!term) return service;
    return {
      ...service,
      priceAmount: term.priceOverrideAmount ?? service.priceAmount,
      durationMinutes: term.durationOverrideMinutes ?? service.durationMinutes,
    };
  });
}

/**
 * Услуги, которых названный мастер не оказывает.
 *
 * Отсутствие строки в `staff_services` — это «не оказывает», а не «оказывает
 * по прайсу»: обратное прочтение вернуло бы ровно ту дыру, ради которой
 * таблица и заведена (SALON.md §4.4).
 */
export function servicesNotPerformed(serviceIds: string[], terms: StaffTerms[]): string[] {
  const performed = new Set(terms.map((term) => term.serviceId));
  return serviceIds.filter((id) => !performed.has(id));
}
