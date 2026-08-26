import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';

import { actionLabel } from '../action-labels';

interface AuditActorLineProps {
  actorName: string | null;
  action: string;
  impersonatedByName: string | null;
}

/**
 * Строка «кто и что сделал» — одна на общий журнал и на карточку мастера.
 *
 * Общая не ради экономии восьми строк разметки, а потому что метку поддержки
 * забыть в одном из двух мест было бы легче всего именно здесь: карточка
 * мастера — тот самый экран, на котором вопрос «это точно была я?» и
 * разбирают, и молчащая на нём метка не значила бы «не было имперсонации»,
 * она значила бы «не дописали».
 *
 * Метка — точка с подписью, а не цветная плашка: правило палитры продукта
 * (см. `Badge`). Тон предупреждающий, потому что событие именно такое —
 * действие в кабинете совершил не его владелец.
 */
export function AuditActorLine({ actorName, action, impersonatedByName }: AuditActorLineProps) {
  const t = useT();

  return (
    <p className="text-sm text-ink">
      <span className="font-semibold">{actorName ?? t.admin.system}</span> {actionLabel(action, t)}
      {impersonatedByName ? (
        <Badge tone="warning" className="ml-2">
          {t.admin.logViaSupport}: {impersonatedByName}
        </Badge>
      ) : null}
    </p>
  );
}
