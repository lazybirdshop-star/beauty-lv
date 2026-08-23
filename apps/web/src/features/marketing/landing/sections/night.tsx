/* Full-bleed photography, one screen tall. Nothing pins: the photograph and
   the words travel up together, as one piece. The text sits in the quiet dark
   third of the actual frame, so no overlay is needed to make it legible
   (IMG-06).

   Кадр приоткрывается, а не просто появляется: маска сходится к краям,
   фотография движется навстречу из лёгкого увеличения — тот же приём, которым
   кино открывает сцену ночью. Отсюда `Reveal` на самой секции: `.is-in` нужен
   не только словам, но и рамке кадра. */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Photo } from '../components/photo';
import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

export function Night({ t }: { t: Messages['marketing'] }) {
  return (
    <Reveal className="night" as="section" threshold={0.22}>
      <div className="night__media">
        {/* Самый тяжёлый файл страницы — 301 КБ исходным JPEG, и приходил он
            наравне с первым экраном, хотя лежит четырьмя блоками ниже.
            Через оптимизатор кадр весит 22 КБ и ждёт своей очереди. */}
        <Photo src="/landing/night-table.jpg" alt={t.nightAlt} sizes="100vw" />
      </div>

      <div className="night__copy shell">
        {/* Время на снимке, а не у читателя: живые часы показали бы «14:30» над
            тёмной студией и текстом «треть записей приходит после закрытия». */}
        <p className="label num rise">02:14</p>
        <h2 className="h2 rise" style={{ '--d': '120ms' } as CSSProperties}>
          {t.nightTitleA}
          <br />
          {t.nightTitleB}
        </h2>
        <p className="lede rise" style={{ '--d': '240ms' } as CSSProperties}>
          {nb(t.nightBody)}
        </p>
      </div>
    </Reveal>
  );
}
