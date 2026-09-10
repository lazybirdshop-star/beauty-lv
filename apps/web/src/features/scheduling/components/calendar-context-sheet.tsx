'use client';

import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useT, useLocale } from '@/lib/i18n';
import { formatCivilDay } from '@/lib/format';

/** Пустое место, по которому нажали: день, час и чья это колонка. */
export interface CalendarContext {
  date: string;
  time: string;
  /** Чьё время; `null` — своё, у соло-мастера другого и нет. */
  memberId: string | null;
  /** Имя — только когда в календаре больше одного человека. */
  memberName?: string;
}

export function CalendarContextSheet({
  context,
  onClose,
  onOpenTime,
}: {
  context: CalendarContext | null;
  onClose: () => void;
  onOpenTime: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const title = context
    ? [formatCivilDay(context.date, locale), context.time, context.memberName]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <SideSheet
      open={Boolean(context)}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      subtitle={t.workspace.chooseTimeAction}
      closeLabel={t.common.close}
    >
      <div className="col" style={{ gap: 12 }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => {
            if (!context) return;
            onClose();
            openWorkspaceAction({
              kind: 'booking',
              date: context.date,
              time: context.time,
              memberId: context.memberId ?? undefined,
            });
          }}
        >
          {t.home.newBooking}
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={onOpenTime}>
          {t.workspace.openTime}
        </button>
        <p className="t-meta">{t.workspace.closedHint}</p>
      </div>
    </SideSheet>
  );
}
