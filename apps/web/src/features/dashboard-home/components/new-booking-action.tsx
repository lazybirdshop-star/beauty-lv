'use client';

/**
 * «Новая запись» в шапке «Сегодня» — единственная розовая кнопка экрана, как
 * в прототипе «Кабинет 2026». Открывает ту же шторку, что «Создать» и
 * сочетание клавиш: запись заводится одним путём, откуда бы ни начали.
 */
import { Button } from '@/components/ui/button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';

export function NewBookingAction({ label }: { label: string }) {
  return (
    <Button
      size="sm"
      className="page-action--create"
      onClick={() => openWorkspaceAction({ kind: 'booking' })}
    >
      <Icon name="plus" className="ico-18" />
      <span>{label}</span>
    </Button>
  );
}
