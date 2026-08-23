/** Ровно то, что отдаёт `GET /client/visits` — и ничего о заметках мастера. */
export interface ClientVisit {
  id: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled_by_client'
    | 'cancelled_by_master'
    | 'no_show';
  startsAt: string;
  /** Время работы; буфер уборки принадлежит мастеру, а не календарю клиента. */
  durationMinutes: number;
  /** До какого момента визит можно отменить самому; `null` — нельзя. */
  cancellableUntil: string | null;
  master: {
    slug: string;
    name: string;
    logoUrl: string | null;
    /** Часовой пояс салона: время визита принадлежит ему, а не смотрящему. */
    timeZone: string;
  };
  items: {
    name: string;
    durationMinutes: number;
    priceAmountMinorUnits: number;
    priceCurrency: string;
  }[];
  /** Услуги визита в сегодняшнем каталоге мастера — ими открывается повтор. */
  serviceIds: string[];
}

/**
 * Разделение считает сервер, а не экран: у браузера часы могут быть свои, и
 * визит, уехавший из-за них не в тот список, выглядит как потерянный.
 */
export interface ClientVisits {
  upcoming: ClientVisit[];
  past: ClientVisit[];
}
