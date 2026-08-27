import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

import { actionLabel } from './action-labels';

/**
 * Каждое действие журнала названо словами (FIX.md F-26).
 *
 * Четыре действия показывались сырыми ключами — `invite_code.created`,
 * `invite_code.revoked`, `subscription.active`, `subscription.frozen`, — а
 * сита журнала собираются из `DISTINCT action`, поэтому ключ добирался и до
 * строки фильтра. Отдельно стоит инвайт-код: фича снята миграцией 0038, но её
 * записи остались и обязаны читаться — журнал отвечает, что произошло тогда, а
 * не что умеет продукт сейчас.
 *
 * Список ниже — то, что API действительно пишет (`auditLogRepository.record`),
 * включая шаблоны `subscription.${status}` и `organization.${status}`,
 * развёрнутые по значениям перечислений.
 */
const WRITTEN_BY_API = [
  'master.blocked',
  'master.unblocked',
  'user.blocked',
  'user.unblocked',
  'user.role_changed',
  'user.impersonated',
  'user.deleted',
  'user.password_changed',
  'user.password_reset',
  'user.email_verified',
  'organization.active',
  'organization.suspended',
  'organization.archived',
  'organization.profile_updated',
  'organization.address_changed',
  'registration_request.approved',
  'registration_request.rejected',
  'registration_request.upgraded',
  'subscription.plan_assigned',
  'subscription.active',
  'subscription.frozen',
  'subscription.cancelled',
  'subscription_plan.created',
  'subscription_plan.updated',
  'subscription_plan.archived',
  'announcement.published',
  'announcement.removed',
  'client.blocked',
  'client.unblocked',
  'client.merged',
  'client.deleted',
  'booking.cancelled',
  'booking.status_changed',
];

/** Снятые фичи: в интерфейсе их нет, в истории они есть. */
const RETIRED = ['invite_code.created', 'invite_code.revoked'];

describe('actionLabel', () => {
  for (const locale of LOCALES) {
    it(`${locale}: ни одно действие не показывается сырым ключом`, () => {
      const t = getMessages(locale);
      for (const action of [...WRITTEN_BY_API, ...RETIRED]) {
        expect(actionLabel(action, t), action).not.toBe(action);
      }
    });
  }

  it('незнакомое действие показывается как есть, а не прячется', () => {
    // API может уйти вперёд словаря; строку журнала при этом терять нельзя.
    const t = getMessages('ru');
    expect(actionLabel('something.new', t)).toBe('something.new');
  });
});
