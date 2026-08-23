/**
 * Часы одной записи.
 *
 * Клиент листает страницу, выбирает услугу, выбирает время, отправляет — и
 * ровно в этот момент у мастера на заблокированном экране всплывает
 * уведомление, свайп поднимает его, открывается «Записи». Кадры внутри
 * телефонов — настоящие снимки продукта; экран блокировки, указатель и
 * уведомление собраны разметкой, потому что снять чужую операционную систему
 * нельзя, а рисовать её пикселем в снимке — значит заморозить то, что должно
 * двигаться.
 *
 * Расписание живёт вне React намеренно: смена такта каждые пару секунд через
 * состояние компонента — это перерисовка поддерева ради двух классов. Здесь
 * такт отдаётся наружу одним значением, а классы вешает уже разметка.
 */

/** Что показывает телефон мастера. */
export type MasterState = 'lock' | 'open';

export interface FlowBeat {
  /** Индекс кадра на стороне клиента. */
  client: number;
  /** Куда указывает палец; `-1` — указателя нет. */
  tap: number;
  master: MasterState;
  push: boolean;
  /** Подсказка свайпа снизу экрана блокировки. */
  swipe: boolean;
  /** Какая сторона ведёт рассказ — по ней узкий экран выбирает, что показать. */
  side: 'client' | 'master';
  /** Сколько держать такт, мс. */
  hold: number;
}

/*
 * Такты неровные намеренно: выбор услуги читается дольше, чем нажатие
 * кнопки, а уведомление обязано повисеть, чтобы его успели прочитать. Ровный
 * шаг превратил бы ход в слайд-шоу.
 *
 * Сторона клиента идёт быстро — полтора такта на нажатие: там нечего читать,
 * там смотрят на движение. Медленно там, где появляется смысл: уведомление и
 * открытый кабинет.
 */
export const BEATS: FlowBeat[] = [
  { client: 0, tap: 0, master: 'lock', push: false, swipe: false, side: 'client', hold: 1400 },
  { client: 1, tap: 1, master: 'lock', push: false, swipe: false, side: 'client', hold: 1600 },
  { client: 2, tap: 2, master: 'lock', push: false, swipe: false, side: 'client', hold: 1500 },
  { client: 3, tap: 3, master: 'lock', push: true, swipe: false, side: 'master', hold: 2200 },
  { client: 3, tap: -1, master: 'lock', push: true, swipe: true, side: 'master', hold: 1600 },
  { client: 3, tap: -1, master: 'open', push: false, swipe: false, side: 'master', hold: 2800 },
];

/** Сколько палец висит поднятым между нажатиями — столько же, сколько едет. */
export const LIFT_MS = 420;

/**
 * Куда указывает палец на стороне клиента — в долях кадра.
 *
 * Значения не назначены на глаз: они сняты с настоящих нажатий тем же
 * сценарием, который делал сами кадры (`boundingBox` кнопки, поделённый на
 * размер окна). Иначе указатель разъехался бы со снимком на первой же правке
 * вёрстки страницы записи.
 */
export const TAPS = [
  { x: 0.5, y: 0.781 }, // «Записаться» на странице
  { x: 0.5, y: 0.58 }, // услуга в шторке
  { x: 0.193, y: 0.738 }, // время
  { x: 0.575, y: 0.944 }, // отправить
] as const;

export interface FlowPlayer {
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

/** Ход идёт, только пока секция на экране и вкладка открыта. */
export function createFlowPlayer(onBeat: (beat: FlowBeat, index: number) => void): FlowPlayer {
  let index = 0;
  let timer = 0;
  let running = false;

  const tick = () => {
    onBeat(BEATS[index]!, index);
    timer = window.setTimeout(() => {
      index = (index + 1) % BEATS.length;
      tick();
    }, BEATS[index]!.hold);
  };

  const stop = () => {
    running = false;
    window.clearTimeout(timer);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      tick();
    },
    stop,
    dispose: () => {
      stop();
      /* Замирает на развязке: всё уже случилось, кабинет открыт. */
      onBeat(BEATS[BEATS.length - 1]!, BEATS.length - 1);
    },
  };
}
