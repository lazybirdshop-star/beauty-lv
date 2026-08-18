/* The three marks are inlined rather than loaded through <img>, because the
   design system draws all of them with currentColor: through an <img> tag the
   stroke falls back to black and the mark disappears on ink. */

const WORD_PATH =
  'M1.1 18.9V7.5a6.4 6.4 0 0 1 12.8 0v11.4M1.1 14h12.8M21.7 18.9V1.1L30.3 12l8.6-10.9v17.8M71.1 1.1v17.8h8.8M86.3 1.1v17.8M103.9 1.1H94.1v17.8h9.8M94.1 10h8.2';

type LogoProps = { className?: string; title?: string };

export function Wordmark({ className, title = 'AMOLIE' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="-0.5 -0.5 106 21"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
    >
      <title>{title}</title>
      <path d={WORD_PATH} />
      <circle cx="55" cy="10" r="9.15" />
    </svg>
  );
}

export function Horizontal({ className, title = 'AMOLIE' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="-0.5 -0.5 150 41"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
    >
      <title>{title}</title>
      <path d="M2.25 37.75V15a12.75 12.75 0 0 1 25.5 0v22.75M2.25 28.5h25.5" strokeWidth="4.5" />
      <g transform="translate(44 10)" strokeWidth="2.2">
        <path d={WORD_PATH} />
        <circle cx="55" cy="10" r="9.15" />
      </g>
    </svg>
  );
}

export function Stacked({ className, title = 'AMOLIE' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="-0.5 -0.5 106 85"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
    >
      <title>{title}</title>
      <g transform="translate(33.75 0) scale(1.25)">
        <path d="M2.25 37.75V15a12.75 12.75 0 0 1 25.5 0v22.75M2.25 28.5h25.5" strokeWidth="4.5" />
      </g>
      <g transform="translate(0 64)" strokeWidth="2.2">
        <path d={WORD_PATH} />
        <circle cx="55" cy="10" r="9.15" />
      </g>
    </svg>
  );
}
