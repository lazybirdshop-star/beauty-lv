import { Icon } from '@/features/dashboard-shell/components/icon';
import type { Messages } from '@/lib/i18n';

/** Полосы одного «прайса» в макете — счётом, а не содержанием. */
const FLAT = 6;
const GROUPS = [3, 2];
/** Сколько настоящих услуг помещается в макет, не ломая его строй. */
const NAMES = 5;

/**
 * Что сделают категории — двумя макетами страницы записи.
 *
 * Пустой экран объяснял пользу словами: «порядок категорий и есть порядок
 * разделов на странице записи». Проверить это утверждение мастер не может,
 * пока не создаст категорию, — то есть польза обещана до того, как её видно.
 * Два макета рядом показывают её сразу: слева страница одним списком, справа
 * та же страница разделами.
 *
 * Макеты схематичны нарочно: подставить сюда настоящие названия услуг
 * значило бы выдумать за мастера, к каким разделам они относятся. Полосы
 * говорят о строении, а не о содержании, и ничего не обещают ложно.
 */
export function GroupingPreview({ t, names = [] }: { t: Messages; names?: string[] }) {
  /* Услуги мастера, а не полосы, — когда они есть: «так ваш прайс выглядит
     сейчас» убедительнее, чем «так выглядит чей-то прайс» (критика
     2026-09-28). Раскладка по разделам остаётся схематичной: какие услуги в
     какой раздел отнести — решение мастера, и подсказывать его за неё было
     бы выдумкой. */
  const real = names.filter((name) => name.trim()).slice(0, NAMES);
  const rows = real.length >= 3 ? real : null;

  return (
    <div className="grouping-show" data-named={rows ? 'true' : undefined}>
      <figure className="grouping-show__frame">
        <span className="grouping-show__sheet" aria-hidden="true">
          {rows
            ? rows.map((name) => (
                <i className="grouping-show__row is-named" key={name}>
                  {name}
                </i>
              ))
            : Array.from({ length: FLAT }, (_, index) => (
                <i className="grouping-show__row" key={index} />
              ))}
        </span>
        <figcaption className="grouping-show__caption">{t.services.groupingFlat}</figcaption>
      </figure>
      <Icon name="arrowR" className="ico-18 grouping-show__arrow" aria-hidden="true" />
      <figure className="grouping-show__frame is-after">
        <span className="grouping-show__sheet" aria-hidden="true">
          {GROUPS.map((count, group) => (
            <span className="grouping-show__group" key={group}>
              <i className="grouping-show__head" />
              {Array.from({ length: count }, (_, index) => {
                const name = rows?.[group === 0 ? index : GROUPS[0]! + index];
                return name ? (
                  <i className="grouping-show__row is-named" key={name}>
                    {name}
                  </i>
                ) : (
                  <i className="grouping-show__row" key={index} />
                );
              })}
            </span>
          ))}
        </span>
        <figcaption className="grouping-show__caption">{t.services.groupingGrouped}</figcaption>
      </figure>
    </div>
  );
}
