import { Card } from '@/components/ui/card';
import { RISE_ITEM, riseDelay } from '@/components/ui/rise';
/* `fmt` берётся из словаря, а не из `@/lib/i18n`: тот модуль помечен
   'use client' ради провайдера и хуков, и вызов его функции из серверного
   компонента роняет страницу целиком — «Attempted to call fmt() from the
   server». Компонент серверный, значит и подстановка должна приходить из
   модуля без границы. */
import { fmt, type Messages } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

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

interface Step {
  label: string;
  hint: string;
  value: number;
}

function steps(funnel: AdminFunnel, t: Messages): Step[] {
  return [
    { label: t.funnel.registered, hint: t.funnel.registeredHint, value: funnel.masters },
    { label: t.funnel.salon, hint: t.funnel.salonHint, value: funnel.withOrganization },
    { label: t.funnel.services, hint: t.funnel.servicesHint, value: funnel.withServices },
    { label: t.funnel.slots, hint: t.funnel.slotsHint, value: funnel.withSlots },
    { label: t.funnel.page, hint: t.funnel.pageHint, value: funnel.withPublishedPage },
    { label: t.funnel.booking, hint: t.funnel.bookingHint, value: funnel.withBooking },
  ];
}

/**
 * Сколько мастеров дошло от регистрации до первого клиента — по шагам.
 *
 * Полоса длиной в долю от первого шага, а не от предыдущего: сравнивать
 * каждый шаг с соседним — значит показывать «85% прошли дальше» там, где до
 * работы дошла треть. Вопрос, ради которого экран открывают, звучит «сколько
 * из пришедших работают», и отвечать на него должна вся картинка сразу.
 *
 * Число рядом с полосой всегда абсолютное. Проценты на платформе, где мастеров
 * сорок, врут громче, чем помогают: «−50%» между двумя шагами это два
 * человека, и знать нужно именно это.
 *
 * **Шаги независимы, и это сказано вслух.** Слово «воронка» обещает вложенные
 * множества — каждый следующий шаг подмножество предыдущего, — а продукт
 * такого порядка не требует: окна можно открыть, не заведя ни одной услуги, и
 * тогда «Открыли окна» шире, чем «Добавили услуги». Цифры при этом верны,
 * неверна была форма: расширяющаяся книзу воронка читается как ошибка счёта.
 * Поэтому картинка называется списком шагов, а не воронкой, и под ней стоит
 * строка, объясняющая, почему четвёртая полоса бывает длиннее третьей.
 */
export function Funnel({ funnel, t }: { funnel: AdminFunnel; t: Messages }) {
  const total = Math.max(funnel.masters, 1);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {steps(funnel, t).map((step, index, all) => {
          const isGoal = index === all.length - 1;
          return (
            <div key={step.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] text-ink">{step.label}</span>
                <span className="shrink-0 font-display text-[17px] leading-none text-ink">
                  {step.value}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-bg-sunken"
                role="img"
                aria-label={`${step.label}: ${step.value}`}
              >
                {/* Полоса вырастает слева направо, лесенкой в 50ms по шагам:
                  воронка читается сверху вниз, и её сужение видно движением,
                  а не только длиной. `prefers-reduced-motion` рост отменяет —
                  правило живёт в самом классе. */}
                <div
                  className={cn(
                    'bar-grow-x h-full rounded-full',
                    /* Чистый акцент достаётся последнему шагу, и только ему:
                       ради первой записи существуют пять предыдущих, и яркая
                       полоса называет цель. Остальные идут приглушённым — тем
                       же цветом глубиной тона, а не второй краской и не
                       чернилами: воронка про людей, а не про объёмы. */
                    isGoal ? 'bg-accent' : 'bg-accent-muted',
                  )}
                  style={{
                    width: `${Math.round((step.value / total) * 100)}%`,
                    ...riseDelay(index * RISE_ITEM),
                  }}
                />
              </div>
              <span className="text-sm text-ink-faint">{step.hint}</span>
            </div>
          );
        })}
      </div>

      <p className="-mt-1 text-sm text-ink-faint">{t.funnel.stepsIndependent}</p>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border pt-3.5 text-sm text-ink-soft">
        <span>{fmt(t.funnel.active, { count: funnel.activeLast30Days })}</span>
        <span>
          {fmt(t.funnel.requests, {
            pending: funnel.requests.pending,
            approved: funnel.requests.approved,
            rejected: funnel.requests.rejected,
          })}
        </span>
      </div>
    </Card>
  );
}
