'use client';

/**
 * Карточка заблокированного времени — шторка `blockDetail` прототипа
 * «Кабинет 2026»: плашка с причиной, временем и чьё оно, строка о том, что
 * снятие делает с окнами, «Снять блок» в подвале.
 *
 * Снятие без «точно?»: у тоста есть «Отменить», и спрашивать о ходе, который
 * возвращается одним нажатием, — лишний шаг. Чужой блок наёмный мастер видит
 * без кнопки и со словами, кто может его снять.
 */
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { blockRangeLabel } from '../time-block-form';
import type { TimeBlock } from '../types';

export function BlockDetailSheet({
  block,
  memberName,
  canRemove,
  removing,
  onRemove,
  onClose,
}: {
  block: TimeBlock;
  /** Имя — только когда в календаре больше одного человека. */
  memberName?: string;
  canRemove: boolean;
  removing: boolean;
  onRemove: (block: TimeBlock) => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t.schedule.blockDetail}
      description={t.schedule.blockHiddenFromClients}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.close}
          </Button>
          {canRemove ? (
            <Button variant="danger-solid" disabled={removing} onClick={() => onRemove(block)}>
              <Icon name="trash" className="ico-16" />
              <span>{t.schedule.blockRemove}</span>
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="info-cell">
          <p className="info-cell__title">{block.title ?? t.schedule.blockDefault}</p>
          <p className="info-cell__meta tnum">
            {blockRangeLabel(block, locale, timeZone, t.schedule.blockAllDay)}
            {memberName ? ` · ${memberName}` : ''}
          </p>
        </div>
        <p className="form-field__hint">
          {canRemove ? t.schedule.blockRemoveHint : t.schedule.blockNotYours}
        </p>
      </div>
    </Sheet>
  );
}
