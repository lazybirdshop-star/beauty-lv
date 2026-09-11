'use client';

/**
 * Лёгкое меню пустого места — спецификация §14 и §23.
 *
 * Нажатие по пустому времени не открывает сразу большую форму: сначала три
 * коротких ответа на вопрос «что здесь сделать» — записать человека, открыть
 * это время клиентам или перейти к периоду. День, час и мастер уже подставлены.
 *
 * На большом экране это меню у места нажатия, а не шторка через полэкрана:
 * взгляд остаётся на сетке, и решение занимает одно движение. На телефоне —
 * лист снизу: меню у пальца там закрывало бы сам палец.
 */
import * as Popover from '@radix-ui/react-popover';
import { useMemo } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { SideSheet } from '@/features/dashboard-shell/components/side-sheet';
import { formatCivilDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { clock } from '../calendar-model';

export interface QuickTarget {
  dateKey: string;
  /** Чьё время; `null` — своё. */
  memberId: string | null;
  /** Имя — только когда в календаре больше одного человека. */
  memberName?: string;
  from: number;
  /** Конец выделенного отрезка; нет — нажали в точку. */
  to?: number;
  /** Куда привязать меню; нет — показать листом снизу. */
  rect?: DOMRect;
  /** Время уже прошло: ни открыть, ни записать в него нельзя. */
  past: boolean;
}

export function CalendarQuickActions({
  target,
  onClose,
  onNewBooking,
  onOpen,
  onBlock,
  onPeriod,
}: {
  target: QuickTarget | null;
  onClose: () => void;
  onNewBooking: (target: QuickTarget) => void;
  /** Открыть сразу — одно окно или весь выделенный отрезок. */
  onOpen: (target: QuickTarget) => void;
  /** «Меня здесь нет» — шторка блока с подставленными днём, часами и человеком. */
  onBlock: (target: QuickTarget) => void;
  onPeriod: (target: QuickTarget) => void;
}) {
  const t = useT();
  const locale = useLocale();

  /* Меню привязано к прямоугольнику клетки или выделения, а не к кнопке: у
     пустого места кнопки нет, есть только место. */
  const anchor = useMemo(
    () => ({
      current: target?.rect ? { getBoundingClientRect: () => target.rect as DOMRect } : null,
    }),
    [target],
  );

  if (!target) return null;

  const when =
    target.to !== undefined ? `${clock(target.from)}–${clock(target.to)}` : clock(target.from);
  const title = [formatCivilDay(target.dateKey, locale), when, target.memberName]
    .filter(Boolean)
    .join(' · ');

  const actions = (
    <div className="cal-quick__actions">
      {target.past ? (
        <p className="t-meta cal-quick__note">{t.schedule.pastTime}</p>
      ) : (
        <>
          <button type="button" className="cal-quick__action" onClick={() => onNewBooking(target)}>
            <Icon name="plus" className="ico-18" />
            <span>{t.home.newBooking}</span>
          </button>
          <button type="button" className="cal-quick__action" onClick={() => onOpen(target)}>
            <Icon name="clock" className="ico-18" />
            <span>
              {target.to !== undefined
                ? fmt(t.schedule.openRange, { from: clock(target.from), to: clock(target.to) })
                : fmt(t.schedule.openAt, { time: clock(target.from) })}
            </span>
          </button>
          <button type="button" className="cal-quick__action" onClick={() => onBlock(target)}>
            <Icon name="lock" className="ico-18" />
            <span>{t.schedule.blockTime}</span>
          </button>
        </>
      )}
      <button type="button" className="cal-quick__action" onClick={() => onPeriod(target)}>
        <Icon name="calendarPlus" className="ico-18" />
        <span>{t.schedule.periodMore}</span>
      </button>
    </div>
  );

  if (!target.rect) {
    return (
      <SideSheet
        open
        onOpenChange={(open) => !open && onClose()}
        title={title}
        subtitle={t.workspace.chooseTimeAction}
        closeLabel={t.common.close}
      >
        {actions}
        <p className="t-meta">{t.workspace.closedHint}</p>
      </SideSheet>
    );
  }

  return (
    <Popover.Root open onOpenChange={(open) => !open && onClose()}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        <Popover.Content
          className="amolie-app cal-quick"
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label={title}
        >
          <p className="cal-quick__title">{title}</p>
          {actions}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
