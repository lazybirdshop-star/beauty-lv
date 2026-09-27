import { Icon } from '@/features/dashboard-shell/components/icon';
import type { Messages } from '@/lib/i18n';

/** Полосы одного «прайса» в макете — счётом, а не содержанием. */
const FLAT = 6;
const GROUPS = [3, 2];

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
export function GroupingPreview({ t }: { t: Messages }) {
  return (
    <div className="grouping-show">
      <figure className="grouping-show__frame">
        <span className="grouping-show__sheet" aria-hidden="true">
          {Array.from({ length: FLAT }, (_, index) => (
            <i className="grouping-show__row" key={index} />
          ))}
        </span>
        <figcaption className="grouping-show__caption">{t.services.groupingFlat}</figcaption>
      </figure>
      <Icon name="arrowR" className="ico-18 grouping-show__arrow" aria-hidden="true" />
      <figure className="grouping-show__frame is-after">
        <span className="grouping-show__sheet" aria-hidden="true">
          {GROUPS.map((rows, group) => (
            <span className="grouping-show__group" key={group}>
              <i className="grouping-show__head" />
              {Array.from({ length: rows }, (_, index) => (
                <i className="grouping-show__row" key={index} />
              ))}
            </span>
          ))}
        </span>
        <figcaption className="grouping-show__caption">{t.services.groupingGrouped}</figcaption>
      </figure>
    </div>
  );
}
