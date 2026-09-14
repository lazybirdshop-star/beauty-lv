'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { setMasterNote } from '../api';

/**
 * Заметка платформы об аккаунте — ячейка прототипа «Кабинет 2026».
 *
 * Такому знанию — «спрашивала про переход на салон, ждёт второго мастера» —
 * до сих пор было негде жить: оно оставалось в голове того, кто разбирал
 * обращение, и следующий разбор начинался с нуля.
 *
 * «Сохранить» доступна только когда текст изменили: кнопка, которая всегда
 * доступна и ничего не делает, ничему не учит. Под заголовком сказано прямо,
 * что мастер этой заметки не видит.
 */
export function AdminNoteCard({
  masterId,
  initial,
  className,
}: {
  masterId: string;
  initial: string;
  className?: string;
}) {
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
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{t.admin.cardNotes}</CardTitle>
          <CardHint>{t.admin.notesPlaceholder}</CardHint>
        </div>
      </CardHeader>

      <div className="form-stack">
        <Textarea
          rows={3}
          value={note}
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          aria-label={t.admin.cardNotes}
        />
        <div className="form-actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={!dirty || mutation.isPending}
            onClick={() => mutation.mutate(note)}
          >
            {mutation.isPending ? t.common.saving : t.common.save}
          </Button>
        </div>
      </div>
    </Card>
  );
}
