'use client';

import { useState, type FormEvent } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n';

import type { AnnouncementAudience, CreateAnnouncementInput } from '../api';

/**
 * Форма объявления — шторкой, а не всегда открытым блоком над списком.
 *
 * В артборде на экране стоит кнопка «Новое объявление», а не форма: раздел
 * чаще открывают, чтобы посмотреть, что сейчас висит, чем чтобы написать
 * новое, и форма занимала полэкрана у всех остальных.
 *
 * Видимые подписи, а не одни плейсхолдеры: плейсхолдер исчезает, как только в
 * поле появляется текст, и человек, вернувшийся к наполовину заполненной
 * форме, не знает, что в каком поле.
 */
export function AnnouncementSheet({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateAnnouncementInput) => void;
  submitting: boolean;
}) {
  const t = useT();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      audience,
      /* Пустая строка из поля даты — это «не задано», а не полночь 1970-го. */
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.announcements.newTitle}>
      <form onSubmit={submit} className="col" style={{ gap: 14 }}>
        <div className="field">
          <label htmlFor="announcement-title" className="label">
            {t.announcements.titleLabel}
          </label>
          <input
            className="input"
            id="announcement-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.announcements.titlePlaceholder}
            required
            minLength={3}
            maxLength={120}
          />
        </div>

        <div className="field">
          <label htmlFor="announcement-body" className="label">
            {t.announcements.bodyLabel}
          </label>
          <textarea
            className="input textarea"
            id="announcement-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t.announcements.bodyPlaceholder}
            required
            minLength={10}
            maxLength={2000}
            rows={4}
          />
        </div>

        <div className="field">
          <label htmlFor="announcement-audience" className="label">
            {t.announcements.audienceLabel}
          </label>
          <select
            className="input"
            id="announcement-audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
          >
            <option value="all">{t.announcements.audienceAll}</option>
            <option value="masters">{t.announcements.audienceMasters}</option>
            <option value="salons">{t.announcements.audienceSalons}</option>
          </select>
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="announcement-starts" className="label">
              {t.announcements.startsAtLabel}
            </label>
            <input
              className="input"
              id="announcement-starts"
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
            <span className="help">{t.announcements.startsAtHint}</span>
          </div>

          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="announcement-ends" className="label">
              {t.announcements.endsAtLabel}
            </label>
            <input
              className="input"
              id="announcement-ends"
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
            <span className="help">{t.announcements.endsAtHint}</span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting ? t.common.saving : t.announcements.publish}
        </button>
      </form>
    </Sheet>
  );
}
