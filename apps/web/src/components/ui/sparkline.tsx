import { riseDelay } from '@/components/ui/rise';
import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Ряд значений от старого к новому. Последнее — то, что происходит сейчас. */
  data: number[];
  /**
   * Что этот ряд означает, словами. График не имеет права быть единственным
   * носителем данных: подпись читает читалка, и она же остаётся, если строка
   * не отрисовалась.
   */
  label: string;
  /** Лесенка появления: линия прочерчивается после того, как встало число. */
  delay?: number;
  className?: string;
}

/** Высота полосы. Ниже 24px соседние периоды перестают различаться. */
const TRACK_PX = 32;
/**
 * Сколько последних периодов показывать. Двенадцать недель — ровно тот срок,
 * которым платформа меряет свою динамику; больше в плитке шириной с ладонь
 * сливается в шум.
 */
const MAX_POINTS = 12;
/** Поля по вертикали, чтобы линия пика и линия дна не липли к краям. */
const PAD = 3;
/** Диаметр точки «сейчас». */
const DOT_PX = 5;

/**
 * Микро-график внутри плитки числа.
 *
 * Приём — `Sparkline` с reactbits.dev и статистические карточки 21st.dev, но
 * собран по законам системы, а не скопирован. Отличий три, и все обязательны:
 *
 * 1. Цвет один и без градиента: линия и поле под ней — второй цвет системы
 *    (лиловый, роль «итоги за период»), точка «сейчас» — чернила. Розовым ряд
 *    красить нельзя: он занят действием и занятым временем, и на белом даёт
 *    3.54:1 при толщине 1.5px — хуже собственной подписи. Точка чернильная,
 *    потому что обязана читаться на любой заливке ячейки, включая лиловую.
 * 2. Прочерчивание идёт `pathLength="1"` и одной кривой продукта, без
 *    измерения длины пути в JS: компонент серверный и не стоит экрану ни
 *    килобайта клиентского бандла. `prefers-reduced-motion` его отменяет.
 * 3. Ряд обязан называть себя словами — иначе это картинка, а не данные.
 *
 * Один период не рисуется линией: линия из одной точки — неправда о ряде.
 * Остаётся точка «сейчас», и это честный ответ «данных пока на один срок».
 */
export function Sparkline({ data, label, delay = 0, className }: SparklineProps) {
  const points = data.slice(-MAX_POINTS);
  if (points.length === 0) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  /* Плоский ряд (все значения равны, в том числе все нули) кладётся серединой
     полосы: растянуть его на всю высоту значило бы нарисовать рост там, где
     ничего не менялось. */
  const span = max - min || 1;
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;

  const coords = points.map((value, index) => {
    const x = index * step;
    const y =
      max === min ? TRACK_PX / 2 : TRACK_PX - PAD - ((value - min) / span) * (TRACK_PX - PAD * 2);
    return { x, y };
  });

  const line = coords.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const area = `0,${TRACK_PX} ${line} 100,${TRACK_PX}`;
  const last = coords[coords.length - 1]!;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('relative block', className)}
      style={{ height: TRACK_PX }}
    >
      {points.length > 1 ? (
        <svg
          aria-hidden="true"
          viewBox={`0 0 100 ${TRACK_PX}`}
          /* `none`: полоса тянется по ширине плитки, а высота остаётся той,
             что задана. Толщину линии от растяжения защищает `vector-effect`,
             а точку «сейчас» — то, что она стоит вне холста. */
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <polygon points={area} className="fill-support/15" />
          <polyline
            points={line}
            pathLength={1}
            className="line-draw fill-none stroke-support"
            style={{ strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', ...riseDelay(delay) }}
          />
        </svg>
      ) : null}
      {/* Точка «сейчас» — тем же кругом, каким система метит новую запись.
          Смещение по горизонтали пропорционально её положению: у правого края
          круг обязан уместиться в плитку целиком, а не наполовину вылезти. */}
      <span
        aria-hidden="true"
        className="dot-in absolute h-[5px] w-[5px] rounded-full bg-support-strong"
        style={{
          left: `calc(${last.x}% - ${(last.x / 100) * DOT_PX}px)`,
          top: last.y - DOT_PX / 2,
          ...riseDelay(delay + 240),
        }}
      />
    </span>
  );
}
