'use client';

/**
 * Фото участника — то, что клиенты видят рядом с именем на странице записи.
 *
 * Одна ручка на два места: «Моё фото» в настройках (человек ставит своё
 * лицо сам) и фото участника на его странице в команде (его ставит тот, кто
 * ведёт команду, — новому мастеру, который сам до кабинета ещё не дошёл).
 * Отличаются они только тем, куда ложится файл и куда сохраняется выбор.
 *
 * `card` — своя ячейка с портретом (настройки). `inline` — раздел внутри
 * карточки человека, под фактами, без второго портрета: портрет у карточки уже
 * есть (прототип «Кабинет 2026», экран `member`).
 *
 * В покое — подпись и одна кнопка «Загрузить фото». Ручка целиком — загрузка,
 * ссылка и точка кадра, та же, что в Студии (`MediaField`), — раскрывается по
 * нажатию: фото меняют редко, и постоянно открытая ручка весила больше, чем
 * сам профиль. Сохраняется кнопкой, а не каждым движением точки:
 * перетаскивание дало бы десяток запросов и десяток пересборок страницы.
 */
import type { MediaDecision } from '@amolie/shared-kernel';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { MediaField } from '@/features/design-studio/components/sections/media-field';
import { describeApiError } from '@/lib/describe-api-error';
import type { UploadTarget } from '@/lib/image-upload';
import { useT } from '@/lib/i18n';

function same(a: MediaDecision | null, b: MediaDecision | null): boolean {
  return a?.url === b?.url && a?.focal.x === b?.focal.x && a?.focal.y === b?.focal.y;
}

export function MemberPhotoCard({
  title,
  name,
  seed,
  initial,
  uploadTarget,
  save,
  variant = 'card',
}: {
  title: string;
  name: string;
  seed: string;
  initial: MediaDecision | null;
  uploadTarget: UploadTarget;
  /** Сохранить или снять (`null`); отвечает тем, что стало на сервере. */
  save: (media: MediaDecision | null) => Promise<MediaDecision | null>;
  variant?: 'card' | 'inline';
}) {
  const t = useT();
  const toast = useToast();
  const [saved, setSaved] = useState<MediaDecision | null>(initial);
  const [draft, setDraft] = useState<MediaDecision | null>(initial);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const result = await save(draft);
      setSaved(result);
      setDraft(result);
      setOpen(false);
      toast({ message: result ? t.team.photoSaved : t.team.photoRemoved });
    } catch (error) {
      toast({ message: describeApiError(error, t), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  const controls = open ? (
    <>
      <MediaField
        media={draft}
        onChange={setDraft}
        focalLabel={t.studio.mediaFocal}
        target={uploadTarget}
      />

      <Button
        variant="secondary"
        size="sm"
        className="member-access__status"
        disabled={saving || same(draft, saved)}
        onClick={() => void submit()}
      >
        {saving ? t.common.saving : t.team.photoSave}
      </Button>
    </>
  ) : (
    <Button
      variant="secondary"
      size="sm"
      className={variant === 'inline' ? 'person-card__photo-action' : undefined}
      aria-expanded={false}
      onClick={() => setOpen(true)}
    >
      <Icon name="image" className="ico-16" />
      <span>{t.studio.mediaUpload}</span>
    </Button>
  );

  if (variant === 'inline') {
    return (
      <section className="person-card__photo" aria-label={title}>
        <div className="member-card__head">
          <h3 className="t-section">{title}</h3>
          <p className="t-meta">{t.team.photoHint}</p>
        </div>
        {controls}
      </section>
    );
  }

  return (
    <section className="card member-card" aria-label={title}>
      <div className="member-photo">
        <MemberAvatar
          className="member-photo__preview"
          name={name}
          seed={seed}
          url={draft?.url}
          focal={draft?.focal}
        />
        <div className="member-card__head">
          <h2 className="t-section">{title}</h2>
          <p className="t-meta">{t.team.photoHint}</p>
        </div>
      </div>

      {controls}
    </section>
  );
}
