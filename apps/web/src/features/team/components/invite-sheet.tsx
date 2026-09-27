'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { RadioCards, SheetSection } from '@/components/ui/sheet-parts';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { roleSections } from '../role-sections';
import type { AssignableRole } from '../types';

const FORM_ID = 'invite-form';

/**
 * Приглашение сотрудника — шторка `invite` прототипа «Кабинет 2026»: почта,
 * имя в салоне и роль карточками; внизу «Отмена» и «Отправить приглашение».
 *
 * Роль выбирается не выпадающим списком, а карточками, у каждой из которых
 * написано, что она открывает. Причина продуктовая, а не декоративная:
 * владелица раздаёт доступ к телефонам своих клиентов и к доходу заведения, а
 * слово «администратор» само по себе не говорит, что именно она отдаёт.
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
  const sections = roleSections(t, role);
  const openCount = sections.filter((section) => section.allowed).length;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ email: email.trim(), role, displayName: displayName.trim() });
  }

  function change(next: boolean) {
    onOpenChange(next);
    /* Закрытая шторка не помнит прошлого адреса: следующее приглашение —
       другому человеку, и подставленная почта коллеги в поле это заявка
       на письмо не тому. */
    if (!next) {
      setEmail('');
      setDisplayName('');
      setRole('master');
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={change}
      title={t.team.inviteTitle}
      description={t.team.inviteHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => change(false)}>
            {t.common.cancel}
          </Button>
          {/* Кнопка остаётся живой при пустой форме.
              Погашенная, она делала шторку экраном без единого действия:
              главное действие — единственное залитое пятно окна, и, потеряв
              цвет, оно унесло с собой всю иерархию (критика 2026-09-26, шаг
              назад после моей же правки). Незаполненное поле объясняет
              ошибка у поля, а не мёртвая кнопка. */}
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {t.team.send}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field id="invite-email" label={t.team.email}>
          <Input
            id="invite-email"
            type="email"
            required
            autoComplete="off"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field id="invite-name" label={t.team.displayName} hint={t.team.displayNameHint}>
          <Input
            id="invite-name"
            aria-describedby="invite-name-hint"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>

        <SheetSection title={t.team.role}>
          <RadioCards<AssignableRole>
            name="invite-role"
            label={t.team.role}
            value={role}
            onChange={setRole}
            options={[
              { value: 'admin', label: t.team.roleAdmin, hint: t.team.roleAdminHint },
              { value: 'master', label: t.team.roleMaster, hint: t.team.roleMasterHint },
            ]}
          />
          {/* Примерка роли: кабинет, который получит приглашённый, — разделами,
              с погашенными закрытыми. Права, показанные интерфейсом, проверить
              можно, а список слов — нельзя; и строится примерка той же
              функцией, что рисует настоящее меню, поэтому разойтись с
              кабинетом она не может. */}
          <div className="role-try">
            <p className="role-try__label type-meta">{t.team.rolePreviewTitle}</p>
            <ul className="role-try__grid">
              {sections.map((section) => (
                <li
                  key={section.key}
                  className={`role-try__chip${section.allowed ? '' : ' is-off'}`}
                >
                  <Icon
                    name={section.allowed ? 'check' : 'lock'}
                    className="ico-14"
                    aria-hidden="true"
                  />
                  <span>{section.label}</span>
                </li>
              ))}
            </ul>
            <p className="role-try__note type-meta" aria-live="polite">
              {fmt(t.team.rolePreviewNote, { open: openCount, total: sections.length })}
            </p>
          </div>
        </SheetSection>

        {error ? (
          <p className="t-meta" role="alert" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
