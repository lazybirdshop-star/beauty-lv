'use client';

/**
 * Карточка заблокированного времени — что, когда, чьё и «снять».
 *
 * Снятие без «точно?»: у тоста есть «Отменить», и спрашивать о ходе, который
 * возвращается одним нажатием, — лишний шаг. Чужой блок наёмный мастер видит
 * без кнопки и со словами, кто может его снять.
 */
import { Icon } from '@/features/dashboard-shell/components/icon';
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
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
    <SideSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={block.title ?? t.schedule.blockDefault}
      subtitle={t.schedule.blockDetail}
      closeLabel={t.common.close}
      footer={
        canRemove ? (
          <button
            type="button"
            className="btn btn-secondary block-detail__remove"
            disabled={removing}
            onClick={() => onRemove(block)}
          >
            <Icon name="trash" className="ico-18" />
            <span>{t.schedule.blockRemove}</span>
          </button>
        ) : undefined
      }
    >
      <div className="block-detail">
        <p className="block-detail__row">
          <Icon name="clock" className="ico-18" />
          <span>{blockRangeLabel(block, locale, timeZone, t.schedule.blockAllDay)}</span>
        </p>
        {memberName ? (
          <p className="block-detail__row">
            <Icon name="user" className="ico-18" />
            <span>{memberName}</span>
          </p>
        ) : null}
      </div>
      <p className="t-meta">{canRemove ? t.schedule.blockRemoveHint : t.schedule.blockNotYours}</p>
    </SideSheet>
  );
}
