/**
 * Знак AMOLIE из `public/brand`, вкомпилированный в разметку.
 *
 * Не `<img src="/brand/…">`: логотип обязан браться цветом текста рядом с
 * собой — на светлой земле он чернильный, в подвале на тёмной инвертируется,
 * и внешний файл этого не умеет. Обводки в исходниках нарисованы через
 * `currentColor`, поэтому наследование работает само.
 *
 * Пропорции — из `viewBox` исходных файлов, один в один, чтобы знак нельзя
 * было незаметно растянуть.
 */

/** Монограмма без слова — для узких мест и мобильной шапки. */
export function AmolieMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-0.5 -0.5 31 41"
      fill="none"
      stroke="currentColor"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="AMOLIE"
      className={className}
    >
      <path d="M2.25 37.75V15a12.75 12.75 0 0 1 25.5 0v22.75M2.25 28.5h25.5" />
    </svg>
  );
}

/**
 * Знак со словом. `aria-label` на всей группе, а не подпись у каждой части:
 * для читалки это одно имя, а не буквы.
 */
export function AmolieHorizontal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-0.5 -0.5 150 41"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="AMOLIE"
      className={className}
    >
      <path d="M2.25 37.75V15a12.75 12.75 0 0 1 25.5 0v22.75M2.25 28.5h25.5" strokeWidth={4.5} />
      <g transform="translate(44 10)" strokeWidth={2.2}>
        <path d="M1.1 18.9V7.5a6.4 6.4 0 0 1 12.8 0v11.4M1.1 14h12.8M21.7 18.9V1.1L30.3 12l8.6-10.9v17.8M71.1 1.1v17.8h8.8M86.3 1.1v17.8M103.9 1.1H94.1v17.8h9.8M94.1 10h8.2" />
        <circle cx="55" cy="10" r="9.15" />
      </g>
    </svg>
  );
}
