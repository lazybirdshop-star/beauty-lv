/**
 * Знак AMOLIE в кабинете.
 *
 * Рисуется `currentColor` и потому наследует чернила той поверхности, на
 * которой стоит: через `<img>` обводка упала бы в чёрный и знак пропал бы на
 * тёмном фоне. Контур тот же, что в артбордах (`app-design/lib.mjs`).
 */
export function Wordmark({ height = 15 }: { height?: number }) {
  return (
    <svg
      viewBox="-0.5 -0.5 106 21"
      style={{ height, width: 'auto' }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="AMOLIE"
    >
      <path d="M1.1 18.9V7.5a6.4 6.4 0 0 1 12.8 0v11.4M1.1 14h12.8M21.7 18.9V1.1L30.3 12l8.6-10.9v17.8M71.1 1.1v17.8h8.8M86.3 1.1v17.8M103.9 1.1H94.1v17.8h9.8M94.1 10h8.2" />
      <circle cx="55" cy="10" r="9.15" />
    </svg>
  );
}
