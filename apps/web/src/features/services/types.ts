export type ServicePriceType = 'fixed' | 'from';

export interface Service {
  id: string;
  organizationId: string;
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
  name: string;
  description: string;
  durationMinutes: number;
  priceAmount: number;
  priceType: ServicePriceType;
  color: string | null;
  imageUrl: string;
  isActive: boolean;
}
