'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { setMasterNote } from '../api';

/**
 * Заметка платформы об аккаунте — по артборду `AdminMasterDetail.dc.html`.
 *
 * Такому знанию — «спрашивала про переход на салон, ждёт второго мастера» —
 * до сих пор было негде жить: оно оставалось в голове того, кто разбирал
 * обращение, и следующий разбор начинался с нуля.
 *
 * Кнопка «Сохранить» появляется только когда текст изменили: кнопка, которая
 * всегда доступна и ничего не делает, ничему не учит.
 *
 * Под полем сказано прямо, что мастер этой заметки не видит. Записывать о
 * человеке то, чего он не увидит, — обычная работа поддержки; делать это,
 * не понимая, кто прочтёт, — нет.
 */
export function AdminNoteCard({ masterId, initial }: { masterId: string; initial: string }) {
  const t = useT();
  const toast = useToast();
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState(initial);

  const mutation = useMutation({
    mutationFn: (value: string) => setMasterNote(masterId, value),
    onSuccess: (_result, value) => {
      setSaved(value);
      toast({ message: t.admin.notesSaved });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const dirty = note !== saved;

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="t-section" style={{ fontSize: 15 }}>
          {t.admin.cardNotes}
        </span>
        {dirty ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(note)}
          >
            {mutation.isPending ? t.common.saving : t.common.save}
          </button>
        ) : null}
      </div>

      <textarea
        className="input textarea"
        style={{ minHeight: 72, fontSize: 13.5, color: 'var(--ink-2)' }}
        value={note}
        maxLength={2000}
        onChange={(event) => setNote(event.target.value)}
        aria-label={t.admin.cardNotes}
      />
      <span className="help" style={{ marginTop: 6, display: 'block' }}>
        {t.admin.notesPlaceholder}
      </span>
    </div>
  );
}
