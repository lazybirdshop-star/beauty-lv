import type { SVGProps } from 'react';

/**
 * The AMOLIE mark: an arch that is also the letter A.
 *
 * Everything below is drawn on a stroke *centre line* inside its design box,
 * so the visual bounding box is exact rather than approximate — the centre
 * lines sit half a stroke in from every edge, and round caps put the ink back
 * on the boundary. Each viewBox carries a 0.5 bleed so the circular `O` of the
 * wordmark can overshoot the cap height without being clipped.
 *
 * The mark repeats as the wordmark's own `A`: the arch is the letterform, not
 * an ornament standing beside one. That is also why `wordmark` — not
 * `horizontal` — is the default for a header: the word already carries the
 * mark, so setting the arch twice makes the eye stutter. Reach for
 * `horizontal` and `stacked` only where a monogram genuinely earns its place.
 *
 * Everything strokes `currentColor`, so a lockup inherits whatever ink the
 * surrounding brand world sets and the platform mark never fights the
 * master's identity.
 */

/** Mark, 30 × 40, stroke 4.5 (11.25% of height). Crossbar at 74% of the leg. */
const MARK = 'M2.25 37.75V15a12.75 12.75 0 0 1 25.5 0v22.75M2.25 28.5h25.5';

/**
 * Mark for ≤24px renders — favicon, dense navigation, an avatar fallback.
 * The stroke goes to 5.5 so the shape survives rasterisation, and the
 * crossbar lifts to 26 so the counter below it stays at least one stroke
 * wide. Same silhouette, different ink budget.
 */
const MARK_COMPACT = 'M2.75 37.25V15a12.25 12.25 0 0 1 24.5 0v22.25M2.75 26h24.5';

/**
 * Wordmark, cap box exactly 105 × 20, stroke 2.2 (11% of cap height — the
 * same relative weight the mark carries). Monoline geometric, tracked at 28%
 * of cap height: at 21% the letters crowd, at 35% the word falls apart into
 * six signs. Round-to-straight pairs (M·O, O·L) close by 0.6 and L·I by 1.4,
 * because the open shoulder of the L reads as space the metric does not know
 * about.
 *
 * The `O` is a true circle at cap height plus a 0.25 overshoot, and lives in
 * `WORDMARK_O` because a stroked circle cannot be written as a path without
 * losing the fact that it is one.
 */
const WORDMARK =
  'M1.1 18.9V7.5a6.4 6.4 0 0 1 12.8 0v11.4M1.1 14h12.8' +
  'M21.7 18.9V1.1L30.3 12l8.6-10.9v17.8' +
  'M71.1 1.1v17.8h8.8' +
  'M86.3 1.1v17.8' +
  'M103.9 1.1H94.1v17.8h9.8M94.1 10h8.2';

const WORDMARK_O = { cx: 55, cy: 10, r: 9.15 } as const;

const MARK_STROKE = 4.5;
const MARK_COMPACT_STROKE = 5.5;
const WORDMARK_STROKE = 2.2;

export type AmolieLogoVariant = 'mark' | 'mark-compact' | 'wordmark' | 'horizontal' | 'stacked';

/** viewBox per variant, each with the shared 0.5 bleed. */
const VIEW_BOX: Record<AmolieLogoVariant, string> = {
  mark: '-0.5 -0.5 31 41',
  'mark-compact': '-0.5 -0.5 31 41',
  wordmark: '-0.5 -0.5 106 21',
  horizontal: '-0.5 -0.5 150 41',
  stacked: '-0.5 -0.5 106 85',
};

interface AmolieLogoProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  variant?: AmolieLogoVariant;
  /**
   * Accessible name. Provide it when the logo *is* the link to the home page;
   * omit it when a text label already says AMOLIE and the mark is decoration.
   */
  title?: string;
}

function Wordmark({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} strokeWidth={WORDMARK_STROKE}>
      <path d={WORDMARK} />
      <circle cx={WORDMARK_O.cx} cy={WORDMARK_O.cy} r={WORDMARK_O.r} />
    </g>
  );
}

export function AmolieLogo({ variant = 'wordmark', title, ...props }: AmolieLogoProps) {
  const labelling = title ? { role: 'img' as const } : { 'aria-hidden': true as const };

  return (
    <svg
      viewBox={VIEW_BOX[variant]}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...labelling}
      {...props}
    >
      {title ? <title>{title}</title> : null}

      {variant === 'mark' ? <path d={MARK} strokeWidth={MARK_STROKE} /> : null}

      {variant === 'mark-compact' ? (
        <path d={MARK_COMPACT} strokeWidth={MARK_COMPACT_STROKE} />
      ) : null}

      {variant === 'wordmark' ? <Wordmark /> : null}

      {variant === 'horizontal' ? (
        <>
          <path d={MARK} strokeWidth={MARK_STROKE} />
          {/* Cap box centred on the mark's 40: (40 − 20) / 2. */}
          <Wordmark x={44} y={10} />
        </>
      ) : null}

      {variant === 'stacked' ? (
        <>
          {/* The mark carries the stacked lockup, so it grows to 1.25× — and
              its stroke grows with it, which is what keeps the proportions of
              the mark itself untouched. Centred on the wordmark: (105 − 37.5) / 2. */}
          <g transform="translate(33.75 0) scale(1.25)">
            <path d={MARK} strokeWidth={MARK_STROKE} />
          </g>
          <Wordmark y={64} />
        </>
      ) : null}
    </svg>
  );
}
