export type ServicePriceType = 'fixed' | 'from';

export interface ServiceCategory {
  id: string;
  organizationId: string;
  name: string;
  /** Цвет раздела. `null` — не выбран, кружок серый. */
  color?: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Present on the dashboard list only — it is what makes deleting a category an informed choice. */
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategoryFormValues {
  name: string;
  isActive: boolean;
  color: string | null;
}

export interface Service {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferAfterMinutes: number;
  priceAmount: number;
  priceCurrency: string;
  priceType: ServicePriceType;
  color: string | null;
  /** Example-of-work photo shown on the public price list. */
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFormValues {
  /** Empty string in the form means "no category"; the API layer turns it into `null`. */
  categoryId: string | null;
  name: string;
  description: string;
  durationMinutes: number;
  /**
   * Уборка после услуги: календарь она съедает наравне с работой.
   *
   * Поле было в схеме, в DTO API и в `Service`, но не выведено ни в одну
   * форму: услуги, заведённые через интерфейс, получали ноль, а мастер видела
   * «75 мин» и не понимала, почему день кончился раньше.
   */
  bufferAfterMinutes: number;
  priceAmount: number;
  priceType: ServicePriceType;
  color: string | null;
  imageUrl: string;
  isActive: boolean;
  /** Services offered on top of this one at booking time. Saved separately from the service itself. */
  addonServiceIds: string[];
  /**
   * Кто оказывает услугу и на каких условиях (SALON.md §4.5).
   *
   * `null` — «форма об этом не спрашивала»: у соло-мастера блока нет вовсе, и
   * присылать за неё пустой список значило бы снять её саму со своей услуги.
   * Пустой массив, наоборот, — это осознанное «никто».
   */
  performers: ServicePerformerInput[] | null;
}

/** Условия одного мастера по услуге; `null` в поле — «как в прайсе». */
export interface ServicePerformerInput {
  organizationMemberId: string;
  priceOverrideAmount: number | null;
  durationOverrideMinutes: number | null;
}

export interface ServicePerformer extends ServicePerformerInput {
  name: string;
  avatarUrl: string | null;
}
