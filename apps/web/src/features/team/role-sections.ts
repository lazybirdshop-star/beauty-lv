import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { getMasterNavItems } from '@/features/dashboard-shell/nav-config';
import type { Messages } from '@/lib/i18n/messages';

import type { AssignableRole } from './types';

/** Раздел кабинета и откроется ли он приглашённому. */
export interface RoleSection {
  key: string;
  label: string;
  allowed: boolean;
}

/** Салон с командой — та форма заведения, в которой вообще есть приглашения. */
const SALON = { organizationType: 'salon', teamSize: 2 } as const;
/* Примерка показывает подписи, а не ведёт по ссылкам: адрес заведения ей не
   нужен, и просить его у шторки значило бы просить лишнее. */
const ANY_SLUG = 'preview';

/**
 * Кабинет, который получит приглашённый, — разделами.
 *
 * Слово «администратор» не говорит, что именно отдаётся: владелица раздаёт
 * доступ к телефонам своих клиентов и к доходу заведения. Список прав словами
 * это объясняет, но проверить его нельзя — а список разделов с погашенными
 * можно: приглашённый увидит ровно это меню.
 *
 * Полный кабинет берётся у владелицы: она видит всё, и разность её меню с
 * меню роли и есть то, чего у роли не будет. Обе стороны считает та же
 * функция, что рисует настоящую панель, поэтому примерка не может разойтись
 * с кабинетом.
 */
export function roleSections(t: Messages, role: AssignableRole): RoleSection[] {
  /* «Сегодня» из примерки исключён: это не право, а то, куда роль попадает
     после входа, — у администратора салона дом Ресепшен, и погашенная
     «Сегодня» обещала бы ему кабинет без начала. */
  const full = getMasterNavItems(ANY_SLUG, t, workspaceCapabilities('owner', SALON)).filter(
    (item) => item.key !== 'home',
  );
  const mine = new Set(
    getMasterNavItems(ANY_SLUG, t, workspaceCapabilities(role, SALON)).map((item) => item.key),
  );
  return full.map((item) => ({ key: item.key, label: item.label, allowed: mine.has(item.key) }));
}
