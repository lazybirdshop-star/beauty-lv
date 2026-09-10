'use client';

import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useT, useLocale } from '@/lib/i18n';
import { formatCivilDay } from '@/lib/format';

export function CalendarContextSheet({
  context,
  onClose,
  onOpenTime,
}: {
  context: { date: string; time: string } | null;
  onClose: () => void;
  onOpenTime: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <SideSheet
      open={Boolean(context)}
      onOpenChange={(open) => !open && onClose()}
      title={context ? `${formatCivilDay(context.date, locale)} · ${context.time}` : ''}
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
            openWorkspaceAction({ kind: 'booking', ...context });
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
