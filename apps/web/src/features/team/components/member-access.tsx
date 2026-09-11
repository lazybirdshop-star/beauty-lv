'use client';

/**
 * Доступ и имя человека — правая колонка его страницы.
 *
 * Роль — двумя вариантами с подписью, что каждая открывает, а не голым
 * списком: «Администратор» без «календарь, записи, команда; без выплат» — это
 * решение вслепую. Роль владельца и свою собственную здесь не меняют: сервер
 * откажет, и кнопка, которая ведёт к отказу, не рисуется — вместо неё сказано,
 * почему.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { renameMember, type TeamMemberDetail } from '../member-api';
import type { AssignableRole } from '../types';
import { useMemberActions } from '../use-member-actions';
import { MemberConfirmSheet } from './member-confirm-sheet';

const ROLES: AssignableRole[] = ['admin', 'master'];

export function MemberAccess({
  slug,
  member,
  isSelf,
}: {
  slug: string;
  member: TeamMemberDetail;
  isSelf: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const cache = useQueryClient();
  const actions = useMemberActions(slug);
  const [name, setName] = useState(member.name);

  const rename = useMutation({
    mutationFn: (value: string) => renameMember(slug, member.id, value.trim() || null),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['team', slug] });
      toast({ message: t.team.nameSaved });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const locked = member.role === 'owner' ? t.team.ownerLocked : isSelf ? t.team.selfLocked : null;

  function submitName(event: FormEvent) {
    event.preventDefault();
    rename.mutate(name);
  }

  return (
    <section className="card member-card" aria-labelledby="member-access">
      <h2 id="member-access" className="t-section">
        {t.team.accessTitle}
      </h2>

      {locked ? (
        <p className="t-meta">{locked}</p>
      ) : (
        <>
          <div className="col" style={{ gap: 8 }} role="radiogroup" aria-label={t.team.role}>
            {ROLES.map((role) => (
              <label
                key={role}
                className={member.role === role ? 'member-role is-on' : 'member-role'}
              >
                <input
                  type="radio"
                  name="member-role"
                  checked={member.role === role}
                  disabled={member.status === 'disabled' || actions.role.isPending}
                  onChange={() => actions.role.mutate({ memberId: member.id, role })}
                />
                <span className="col" style={{ gap: 2 }}>
                  <span className="t-strong">
                    {role === 'admin' ? t.team.roleAdmin : t.team.roleMaster}
                  </span>
                  <span className="t-meta">
                    {role === 'admin' ? t.team.roleAdminHint : t.team.roleMasterHint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {member.status === 'disabled' ? (
            <button
              type="button"
              className="btn btn-secondary member-access__status"
              onClick={() => actions.askRestore(member)}
            >
              {t.team.restore}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost member-access__status member-danger"
              onClick={() => void actions.askDisable(member)}
            >
              {t.team.disable}
            </button>
          )}
        </>
      )}

      <div className="divider" />

      <form className="col" style={{ gap: 8 }} onSubmit={submitName}>
        <label htmlFor="member-name" className="t-label">
          {t.team.displayName}
        </label>
        <div className="member-name-form">
          <Input
            id="member-name"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={rename.isPending || name.trim() === member.name}
          >
            {t.common.save}
          </button>
        </div>
        <p className="t-meta">{t.team.displayNameHint}</p>
      </form>

      <MemberConfirmSheet
        confirm={actions.confirm}
        loading={actions.status.isPending}
        onClose={actions.closeConfirm}
        onConfirm={actions.applyConfirm}
      />
    </section>
  );
}
