/* Одна и та же минута — единственный светлый блок страницы.
 *
 * Витрина рассказывает, что страница делает; переписка — от чего избавляет;
 * облики — как выглядит. Здесь читатель наконец видит, как это происходит:
 * два настоящих экрана продукта, помеченных одним временем. Касание с одной
 * стороны и строка в календаре с другой — одна и та же секунда, и никто не
 * написал ни слова.
 *
 * Рифма с блоком переписки намеренная. Там всё начинается в 23:41 и тянется
 * до 13:04 следующего дня; здесь 23:41 заканчивается в 23:42. Одна и та же
 * минута старта, разный конец: переписка это рассказывает, а этот блок
 * показывает.
 *
 * Земля светлая, и это не украшение. Блок показывает кабинет, а кабинет
 * светлый — он и надевает его собственную краску (`--light-field`, токены
 * которой лежат в мире с самого начала и до сих пор не были никем надеты).
 * Заодно страница получает единственную паузу между семью чернильными
 * экранами и перестаёт читаться мрачной.
 *
 * Корпуса телефона у снимков нет: на странице уже два устройства с рамками —
 * модель в герое и веер в обликах, — и третья трактовка сделала бы из приёма
 * шаблон. Снимки лежат со скруглением страницы и волосяной линией по краю,
 * без тени.
 */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Photo } from '../components/photo';
import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

function Screen({
  src,
  alt,
  time,
  caption,
  delay,
}: {
  src: string;
  alt: string;
  time: string;
  caption: string;
  delay: number;
}) {
  return (
    <figure className="minute__screen rise" style={{ '--d': `${delay}ms` } as CSSProperties}>
      {/* Время набрано тем же табличным начертанием, что часы в переписке, а
          точка рядом — та самая, которой в системе отмечен занятый час. */}
      <p className="minute__time num">
        <span className="dot" aria-hidden="true" />
        {time}
      </p>
      <div className="minute__shot">
        <Photo src={src} alt={alt} sizes="(max-width: 860px) 78vw, 300px" />
      </div>
      <figcaption className="minute__caption">{caption}</figcaption>
    </figure>
  );
}

export function Minute({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="section minute" id="minute">
      <Reveal className="shell minute__inner" as="div">
        <div className="minute__head">
          <p className="label rise">{t.minuteLabel}</p>
          <h2 className="h2 minute__title rise" style={{ '--d': '100ms' } as CSSProperties}>
            {t.minuteTitleA}
            <br />
            {t.minuteTitleB}
          </h2>
          <p className="lede minute__lede rise" style={{ '--d': '200ms' } as CSSProperties}>
            {nb(t.minuteBody)}
          </p>
        </div>

        <div className="minute__pair">
          <Screen
            src="/landing/minute-client.jpg"
            alt={t.minuteClientAlt}
            time={t.minuteTime}
            caption={t.minuteClient}
            delay={300}
          />
          <Screen
            src="/landing/minute-master.jpg"
            alt={t.minuteMasterAlt}
            time={t.minuteTime}
            caption={t.minuteMaster}
            delay={400}
          />
        </div>
      </Reveal>
    </section>
  );
}
