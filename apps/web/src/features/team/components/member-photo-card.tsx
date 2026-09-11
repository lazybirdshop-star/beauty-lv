'use client';

/**
 * Фото участника — то, что клиенты видят рядом с именем на странице записи.
 *
 * Одна карточка на два места: «Моё фото» в настройках (человек ставит своё
 * лицо сам) и фото участника на его странице в команде (его ставит тот, кто
 * ведёт команду, — новому мастеру, который сам до кабинета ещё не дошёл).
 * Отличаются они только тем, куда ложится файл и куда сохраняется выбор.
 *
 * Загрузка, ссылка и точка кадра — та же ручка, что в Студии (`MediaField`):
 * второй способ поставить то же фото разошёлся бы с первым на первой правке.
 * Сохраняется кнопкой, а не каждым движением точки: перетаскивание дало бы
 * десяток запросов и десяток пересборок публичной страницы.
 */
import type { MediaDecision } from '@amolie/shared-kernel';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
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
}: {
  title: string;
  name: string;
  seed: string;
  initial: MediaDecision | null;
  uploadTarget: UploadTarget;
  /** Сохранить или снять (`null`); отвечает тем, что стало на сервере. */
  save: (media: MediaDecision | null) => Promise<MediaDecision | null>;
}) {
  const t = useT();
  const toast = useToast();
  const [saved, setSaved] = useState<MediaDecision | null>(initial);
  const [draft, setDraft] = useState<MediaDecision | null>(initial);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const result = await save(draft);
      setSaved(result);
      setDraft(result);
      toast({ message: result ? t.team.photoSaved : t.team.photoRemoved });
    } catch (error) {
      toast({ message: describeApiError(error, t), tone: 'danger' });
    } finally {
      setSaving(false);
    }
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

      <MediaField
        media={draft}
        onChange={setDraft}
        focalLabel={t.studio.mediaFocal}
        target={uploadTarget}
      />

      <button
        type="button"
        className="btn btn-secondary"
        style={{ alignSelf: 'flex-start' }}
        disabled={saving || same(draft, saved)}
        onClick={() => void submit()}
      >
        {saving ? t.common.saving : t.team.photoSave}
      </button>
    </section>
  );
}
