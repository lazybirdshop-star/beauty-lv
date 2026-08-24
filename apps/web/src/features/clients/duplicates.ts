import { phoneMatchKey } from '@amolie/shared-kernel';

import type { Client } from './types';

/**
 * Две карточки одного человека.
 *
 * Дубли завелись до того, как форма научилась их ловить: уникальный индекс
 * базы сравнивал **строки** номеров, а «20000114» и «+37120000114» — разные
 * строки. Заводить новые больше нельзя, но уже заведённые никуда не делись.
 *
 * Группируются по тому же правилу сравнения, что и всё остальное в продукте
 * (`phoneMatchKey`, хвост номера). Это не догадка «похожи ли имена»: карточки
 * в одной группе **уже** показывают одну и ту же историю визитов, потому что
 * записи соединяются с адресной книгой этим же хвостом. То есть мастер видит
 * двух людей там, где продукт давно видит одного.
 *
 * Карточки без телефона не группируются: пустой ключ склеил бы в одну группу
 * всех, кого мастер завела без номера.
 */
export interface DuplicateGroup {
  matchKey: string;
  clients: Client[];
}

export function findDuplicateGroups(clients: Client[]): DuplicateGroup[] {
  const byKey = new Map<string, Client[]>();

  for (const client of clients) {
    const key = phoneMatchKey(client.phone ?? '');
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), client]);
  }

  return [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([matchKey, group]) => ({ matchKey, clients: group }));
}

/**
 * Какую карточку оставлять при слиянии.
 *
 * Ту, где больше сведений: слияние переносит всё, но выбор «главной» решает,
 * чьи имя и номер останутся видимыми, а имя — это то, как мастер человека
 * называет. Полнота считается по заполненным полям, при равенстве побеждает
 * заведённая раньше: она, скорее всего, и есть «настоящая», а вторая появилась
 * из записи, где гость представился иначе.
 */
export function preferredClient(group: Client[]): Client {
  const filled = (client: Client) =>
    [client.email, client.instagramHandle, client.notes, client.flag].filter(Boolean).length;

  return [...group].sort((a, b) => {
    const byFilled = filled(b) - filled(a);
    if (byFilled !== 0) return byFilled;
    return a.createdAt.localeCompare(b.createdAt);
  })[0]!;
}
