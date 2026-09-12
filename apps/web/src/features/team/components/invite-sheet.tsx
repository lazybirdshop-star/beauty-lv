'use client';

import { useState, type FormEvent } from 'react';

import { Input } from '@/components/ui/input';
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';

import type { AssignableRole } from '../types';

/**
 * Приглашение сотрудника.
 *
 * Роль выбирается не выпадающим списком, а двумя строками, у каждой из
 * которых написано, что она открывает. Причина продуктовая, а не
 * декоративная: владелица раздаёт доступ к телефонам своих клиентов и к
 * выручке заведения, а слово «администратор» само по себе не говорит, что
 * именно она отдаёт. Список из двух пунктов с последствием у каждого
 * читается один раз и не отправляет никого в справку.
 */
export function InviteSheet({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { email: string; role: AssignableRole; displayName: string }) => void;
  submitting: boolean;
  error: string | null;
}) {
  const t = useT();
  const validate = useLocalizedValidation();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AssignableRole>('master');

  const roles: { key: AssignableRole; label: string; hint: string }[] = [
    { key: 'master', label: t.team.roleMaster, hint: t.team.roleMasterHint },
    { key: 'admin', label: t.team.roleAdmin, hint: t.team.roleAdminHint },
  ];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ email: email.trim(), role, displayName: displayName.trim() });
  }

  return (
    <SideSheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        /* Закрытая шторка не помнит прошлого адреса: следующее приглашение —
           другому человеку, и подставленная почта коллеги в поле это заявка
           на письмо не тому. */
        if (!next) {
          setEmail('');
          setDisplayName('');
          setRole('master');
        }
      }}
      title={t.team.inviteTitle}
      subtitle={t.team.inviteHint}
      closeLabel={t.common.close}
      footer={
        <button
          type="submit"
          form="invite-form"
          className="btn btn-primary btn-lg"
          disabled={submitting}
        >
          {t.team.send}
        </button>
      }
    >
      <form
        id="invite-form"
        ref={validate}
        onSubmit={handleSubmit}
        className="col"
        style={{ gap: 18 }}
      >
        <div className="col" style={{ gap: 8 }}>
          <label htmlFor="invite-email" className="text-sm font-semibold text-ink-soft">
            {t.team.email}
          </label>
          <Input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <fieldset className="col team-roles">
          <legend className="text-sm font-semibold text-ink-soft">{t.team.role}</legend>
          {roles.map((item) => (
            <label key={item.key} className="team-role">
              <input
                type="radio"
                name="role"
                value={item.key}
                checked={role === item.key}
                onChange={() => setRole(item.key)}
              />
              <span className="col" style={{ gap: 2 }}>
                <span className="t-strong">{item.label}</span>
                <span className="t-meta">{item.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="col" style={{ gap: 8 }}>
          <label htmlFor="invite-name" className="text-sm font-semibold text-ink-soft">
            {t.team.displayName}
          </label>
          <Input
            id="invite-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <span className="t-meta">{t.team.displayNameHint}</span>
        </div>

        {error ? (
          <p className="t-meta" role="alert" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        ) : null}
      </form>
    </SideSheet>
  );
}
