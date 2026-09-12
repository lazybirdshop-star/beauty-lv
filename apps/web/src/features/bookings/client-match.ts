import { phoneMatchKey } from '@amolie/shared-kernel';

import type { Client } from '@/features/clients/types';

/**
 * Клиент записи — по хвосту телефона, как и везде в продукте (approved N-2).
 *
 * У записи нет точной ссылки на карточку клиента (backlog R-31): и ручная, и
 * публичная запись пишут клиента в книгу по номеру, и тем же номером его
 * находят обратно. Без номера совпадения нет — пустой ключ склеил бы всех,
 * кого мастер завела без телефона.
 */
export function findClientByPhone(
  clients: readonly Client[] | undefined,
  phone: string | null | undefined,
): Client | null {
  if (!clients?.length || !phone) return null;
  const key = phoneMatchKey(phone);
  if (!key) return null;
  return clients.find((client) => phoneMatchKey(client.phone ?? '') === key) ?? null;
}
