'use client';

/* Переписка проигрывается, а не появляется: индикатор «печатает…», пауза,
 * сообщение. Разрыв между вопросом в 23:41 и ответом в 09:12 — смысл блока,
 * и теперь его видно по хронометражу, а не по подписи. Кульминация — плашка
 * «Booked», которая приходит последней, после «Seen».
 *
 * Два правила, без которых приём вредит странице:
 *
 * 1. Прочитанное не гаснет. Сервер рисует диалог целиком, поэтому прятать его
 *    можно только пока читатель до панели не добрался. Скрытие ставится сразу
 *    после гидратации (панель лежит вторым экраном вниз), а если к этому
 *    моменту она уже в кадре — проигрывание просто не начинается.
 * 2. Ничего не двигается. Растущая переписка меняет высоту панели, а под ней
 *    лежит вся остальная страница: до того, как что-либо спрятать, полная
 *    высота замеряется и резервируется через `--dm-h`.
 *
 * Без JS и при `prefers-reduced-motion` разметка стоит целиком и сразу —
 * приход ей рисует CSS-лестница `.is-in .dm__row` из styles/sections.css.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useEffect, useRef } from 'react';

import { nb } from '../lib/typo';

/* Время — не текст, а данные: часы читаются одинаково на всех трёх языках, и
   выносить их в словарь значило бы дать переводчику сломать разрыв между
   вопросом и ответом, ради которого блок и существует. */
const THREAD = [
  { id: 'ask', side: 'in', time: '23:41', key: 'dmMsg1' },
  { id: 'ask2', side: 'in', time: '23:41', key: 'dmMsg2' },
  { id: 'wait', side: 'out', time: '09:12', key: 'dmMsg3' },
  { id: 'still', side: 'in', time: '13:04', key: 'dmMsg4' },
] as const;

/* Хронометраж: [пауза перед «печатает», сколько «печатают»]. Длинное «let me
   check» набирается дольше однострочного «any luck?» — темп подчинён тексту.
   Весь ход укладывается в 4.3 секунды: развязка должна успеть прийти, пока
   читатель ещё смотрит на панель. */
const TIMING: Array<{ pause: number; typing: number }> = [
  { pause: 260, typing: 560 },
  { pause: 220, typing: 460 },
  { pause: 340, typing: 660 },
  { pause: 360, typing: 540 },
];

const AFTER_SEEN = 380;
const AFTER_BOOKED = 520;

export function DmPlayer({ t }: { t: Messages['marketing'] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timers: number[] = [];
    let io: IntersectionObserver | null = null;
    let cancelled = false;

    const at = (delay: number, run: () => void) => {
      timers.push(window.setTimeout(run, delay));
    };

    const play = () => {
      const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-dm-row]'));
      const typing = root.querySelector<HTMLElement>('[data-dm-typing]');
      const seen = root.querySelector<HTMLElement>('.dm__seen');
      const rule = root.querySelector<HTMLElement>('.rule');
      const booked = root.querySelector<HTMLElement>('.dm__booked');

      let clock = 0;
      THREAD.forEach((m, i) => {
        const step = TIMING[i]!;
        clock += step.pause;
        at(clock, () => {
          if (typing) typing.className = `dm__row dm__row--${m.side} dm__typing-row is-shown`;
        });
        clock += step.typing;
        at(clock, () => {
          typing?.classList.remove('is-shown');
          rows[i]?.classList.add('is-shown');
        });
      });

      clock += AFTER_SEEN;
      at(clock, () => seen?.classList.add('is-shown'));

      clock += AFTER_BOOKED;
      at(clock, () => {
        rule?.classList.add('is-shown');
        booked?.classList.add('is-shown');
        /* Ход кончился — резерв высоты больше не нужен: панель снова живёт по
           своему содержимому и переживает поворот экрана. */
        root.style.removeProperty('--dm-h');
      });
    };

    const arm = () => {
      if (cancelled) return;

      const box = root.getBoundingClientRect();
      /* Панель уже в кадре: прятать то, что читатель видит, нельзя ни ради
         какого приёма — оставляем разметку как есть. */
      if (box.top < window.innerHeight && box.bottom > 0) return;

      root.style.setProperty('--dm-h', `${Math.ceil(box.height)}px`);
      root.classList.add('is-playing');

      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          io?.disconnect();
          play();
        },
        { threshold: 0.35 },
      );
      io.observe(root);
    };

    /* Высоту меряем по осевшим шрифтам: замер на фолбэке дал бы резерв меньше
       фактического, и страница всё-таки дёрнулась бы. */
    void document.fonts.ready.then(arm);

    return () => {
      cancelled = true;
      io?.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      root.classList.remove('is-playing');
      root.style.removeProperty('--dm-h');
    };
  }, []);

  return (
    <div ref={rootRef} className="dm__live">
      <ol className="dm__thread">
        {THREAD.map((m) => (
          <li key={m.id} className={`dm__row dm__row--${m.side}`} data-dm-row>
            {m.side === 'in' && <span className="dm__face" aria-hidden="true" />}
            <span className={`dm__bubble dm__bubble--${m.side}`}>{t[m.key]}</span>
            <span className="dm__time num">{m.time}</span>
          </li>
        ))}

        {/* Индикатор набора живёт в разметке постоянно и включается классом:
            так между сообщениями не появляется и не исчезает узел, от которого
            прыгала бы высота списка. */}
        <li className="dm__row dm__typing-row" data-dm-typing aria-hidden="true">
          <span className="dm__face" />
          <span className="dm__bubble dm__typing">
            <i />
            <i />
            <i />
          </span>
        </li>
      </ol>

      <p className="dm__seen muted">{t.dmSeen}</p>

      <hr className="rule" />

      <div className="dm__booked">
        <span className="dot" aria-hidden="true" />
        <div>
          <p className="dm__booked-title">{t.dmBookedTitle}</p>
          <p className="dm__booked-note muted">{nb(t.dmBookedNote)}</p>
        </div>
      </div>
    </div>
  );
}
