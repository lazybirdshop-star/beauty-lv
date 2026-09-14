/**
 * Шаги мастера — `.funnel` прототипа «Кабинет 2026»: подпись, полоса, число
 * и переход от предыдущего шага одной строкой.
 *
 * Полоса длиной в долю от первого шага, а не от предыдущего: сравнивать
 * каждый шаг только с соседним — значит показывать «85% прошли дальше» там,
 * где до работы дошла треть. Вопрос, ради которого экран открывают, звучит
 * «сколько из пришедших работают», и отвечать на него должна вся картинка.
 *
 * **Шаги независимы, и это сказано вслух.** Слово «воронка» обещает вложенные
 * множества, а продукт такого порядка не требует: окна можно открыть, не
 * заведя ни одной услуги, и тогда переход выходит больше ста процентов. Цифры
 * при этом верны, неверна была бы сужающаяся форма.
 */
/* `fmt` берётся из словаря, а не из `@/lib/i18n`: тот модуль помечен
   'use client', и вызов его функции из серверного компонента роняет
   страницу целиком. */
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { fmt, type Messages } from '@/lib/i18n/messages';

export interface AdminFunnel {
  masters: number;
  withOrganization: number;
  withServices: number;
  withSlots: number;
  withPublishedPage: number;
  withBooking: number;
  activeLast30Days: number;
  requests: { pending: number; approved: number; rejected: number };
}

function steps(funnel: AdminFunnel, t: Messages): { label: string; value: number }[] {
  return [
    { label: t.funnel.registered, value: funnel.masters },
    { label: t.funnel.salon, value: funnel.withOrganization },
    { label: t.funnel.services, value: funnel.withServices },
    { label: t.funnel.slots, value: funnel.withSlots },
    { label: t.funnel.page, value: funnel.withPublishedPage },
    { label: t.funnel.booking, value: funnel.withBooking },
  ];
}

export function Funnel({
  funnel,
  t,
  className,
}: {
  funnel: AdminFunnel;
  t: Messages;
  className?: string;
}) {
  const total = Math.max(funnel.masters, 1);
  const all = steps(funnel, t);

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{t.funnel.title}</CardTitle>
          <CardHint>{fmt(t.funnel.active, { count: funnel.activeLast30Days })}</CardHint>
        </div>
      </CardHeader>

      <ul className="admin-funnel">
        {all.map((step, index) => {
          const previous = index === 0 ? null : all[index - 1]!.value;
          /* Чистый акцент — последнему шагу: ради первой записи существуют
             пять предыдущих, и насыщенная полоса называет цель. */
          const isGoal = index === all.length - 1;
          return (
            <li className="admin-funnel__step" key={step.label}>
              <span className="admin-funnel__label">{step.label}</span>
              <span
                className="admin-funnel__track"
                role="img"
                aria-label={`${step.label}: ${step.value}`}
              >
                <i
                  className={isGoal ? 'is-goal' : undefined}
                  style={{ width: `${Math.round((step.value / total) * 100)}%` }}
                />
              </span>
              <span className="admin-funnel__n tnum">{step.value}</span>
              <span className="admin-funnel__pct tnum">
                {previous ? `${Math.round((step.value / previous) * 100)}%` : ''}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="admin-footnote">{t.funnel.stepsIndependent}</p>
    </Card>
  );
}
