/**
 * Шаги мастера — по артборду `AdminOverview.dc.html`.
 *
 * Полоса длиной в долю от первого шага, а не от предыдущего: сравнивать
 * каждый шаг только с соседним — значит показывать «85% прошли дальше» там,
 * где до работы дошла треть. Вопрос, ради которого экран открывают, звучит
 * «сколько из пришедших работают», и отвечать на него должна вся картинка.
 *
 * Справа от числа — переход от предыдущего шага, как в макете. У первого шага
 * его нет: сравнивать не с чем, и место под столбец всё равно занято, чтобы
 * числа стояли в колонку.
 *
 * **Шаги независимы, и это сказано вслух.** Слово «воронка» обещает вложенные
 * множества — каждый следующий шаг подмножество предыдущего, — а продукт
 * такого порядка не требует: окна можно открыть, не заведя ни одной услуги, и
 * тогда «Открыли окна» шире, чем «Добавили услуги», а переход выходит больше
 * ста процентов. Цифры при этом верны, неверна была бы форма: сужающаяся
 * воронка читается как обещание, которого данные не дают.
 */
/* `fmt` берётся из словаря, а не из `@/lib/i18n`: тот модуль помечен
   'use client' ради провайдера и хуков, и вызов его функции из серверного
   компонента роняет страницу целиком — «Attempted to call fmt() from the
   server». Компонент серверный, значит и подстановка должна приходить из
   модуля без границы. */
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

export function Funnel({ funnel, t }: { funnel: AdminFunnel; t: Messages }) {
  const total = Math.max(funnel.masters, 1);
  const all = steps(funnel, t);

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="t-section" style={{ fontSize: 15 }}>
          {t.funnel.title}
        </span>
        <span className="t-meta">{fmt(t.funnel.active, { count: funnel.activeLast30Days })}</span>
      </div>

      <div className="col" style={{ gap: 14 }}>
        {all.map((step, index) => {
          const previous = index === 0 ? null : all[index - 1]!.value;
          const isGoal = index === all.length - 1;
          return (
            <div className="col" key={step.label} style={{ gap: 4 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13.5 }}>
                <span style={{ fontWeight: 500 }}>{step.label}</span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="tnum" style={{ fontWeight: 600 }}>
                    {step.value}
                  </span>
                  <span className="t-meta tnum" style={{ width: 34, textAlign: 'right' }}>
                    {previous ? `${Math.round((step.value / previous) * 100)}%` : ''}
                  </span>
                </span>
              </div>
              <div className="funnel-track" role="img" aria-label={`${step.label}: ${step.value}`}>
                <span
                  className={isGoal ? 'funnel-fill is-goal' : 'funnel-fill'}
                  style={{ width: `${Math.round((step.value / total) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="t-meta" style={{ marginTop: 14 }}>
        {t.funnel.stepsIndependent}
      </p>
    </div>
  );
}
