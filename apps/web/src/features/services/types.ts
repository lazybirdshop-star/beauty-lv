export type ServicePriceType = 'fixed' | 'from';

export interface ServiceCategory {
  id: string;
  organizationId: string;
  name: string;
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
  priceAmount: number;
  priceType: ServicePriceType;
  color: string | null;
  imageUrl: string;
  isActive: boolean;
}
