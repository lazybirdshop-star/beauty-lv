import { actionLabel } from '@/features/admin/logs/action-labels';
import { clientApiFetch } from '@/lib/client-api';
import type { Messages } from '@/lib/i18n/messages';

/** Строка журнала заведения — проекция, без внутренних полей журнала платформы. */
export interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorName: string | null;
  /** Сделано поддержкой из кабинета заведения. */
  viaSupport: boolean;
  severity: 'info' | 'warning';
}

export interface ActivityLogPage {
  items: ActivityLogEntry[];
  total: number;
}

export function listActivityLog(slug: string, limit: number): Promise<ActivityLogPage> {
  return clientApiFetch<ActivityLogPage>(`/organizations/${slug}/activity-log?limit=${limit}`);
}

/**
 * Кто действовал — словами.
 *
 * Действие клиента по ссылке из письма пишется без личности: аккаунта у гостя
 * нет. Подпись «Система» под «отменил запись» утверждала бы, что запись
 * отменил продукт, — а отменил человек, и журнал обязан так и сказать.
 */
export function actorLabel(entry: ActivityLogEntry, t: Messages): string {
  if (entry.action.endsWith('_by_client')) return t.workspace.journalClient;
  return entry.actorName ?? t.admin.system;
}

/** Что сделано — подписью админского журнала, с пометкой «через поддержку». */
export function entryLabel(entry: ActivityLogEntry, t: Messages): string {
  const label = actionLabel(entry.action, t);
  return entry.viaSupport ? `${label} · ${t.admin.logViaSupport}` : label;
}

/** Строка журнала после склейки повторов: первое действие серии и их число. */
export interface ActivityLogRow {
  entry: ActivityLogEntry;
  count: number;
}

/**
 * Подряд идущие одинаковые действия одного человека — одной строкой «×7».
 *
 * Семь «правка профиля заведения» подряд с разницей в минуту — это одна
 * правка, сохранённая несколько раз, и столбик одинаковых строк прятал всё
 * остальное за сгиб. Склеиваются только соседи: то же действие через другое
 * — уже другой случай, и журнал обязан показать порядок.
 */
export function collapseRepeats(entries: readonly ActivityLogEntry[]): ActivityLogRow[] {
  const rows: ActivityLogRow[] = [];
  for (const entry of entries) {
    const last = rows.at(-1);
    if (
      last &&
      last.entry.action === entry.action &&
      last.entry.actorName === entry.actorName &&
      last.entry.entityId === entry.entityId &&
      last.entry.viaSupport === entry.viaSupport
    ) {
      last.count += 1;
    } else {
      rows.push({ entry, count: 1 });
    }
  }
  return rows;
}
