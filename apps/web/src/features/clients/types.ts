/** Private marker the master puts on a client. Never leaves the dashboard. */
export type ClientFlag = 'attention' | 'favourite' | null;

/**
 * Что стоит под именем клиента в списке — приходит с сервера.
 *
 * Считалось это в кабинете: экран брал **всю** историю записей организации и
 * сводил её по телефонам у себя. Через год работы мастера — вся история за год
 * на телефон, чтобы показать «7 визитов» под каждым именем.
 *
 * Любимой услуги здесь нет намеренно: её видит только открытая карточка, а
 * карточка и так грузит историю своего клиента (см. `getClientVisitStats`).
 */
export interface ClientVisitCounts {
  /** Без отменённых: визит, которого не было, — не «раз, когда она приходила». */
  totalBookings: number;
  /** Последний **завершённый** визит; будущая запись ещё не состоялась. */
  lastVisitAt: string | null;
}

export interface Client {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string | null;
  instagramHandle: string | null;
  notes: string | null;
  flag: ClientFlag;
  isBlocked: boolean;
  visitStats: ClientVisitCounts;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormValues {
  flag: string | null;
  fullName: string;
  phone: string;
  email: string;
  instagramHandle: string;
  notes: string;
}
