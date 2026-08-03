/**
 * The hero's own backdrop when no banner photo is set.
 *
 * Three offset radial washes rather than one flat fade: a single linear
 * gradient reads as "unfinished background", while overlapping soft fields
 * give the light somewhere to come from. Everything is mixed from the
 * palette's own tokens via `color-mix`, so all seven themes — including the
 * two dark ones — get a version of the same idea instead of a tint that
 * only works on pink.
 */
export function HeroGradient() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-full overflow-hidden rounded-b-[32px]"
      style={{
        backgroundImage: [
          // Warm accent light entering from the top-left.
          'radial-gradient(120% 90% at 12% -10%, color-mix(in srgb, var(--accent) 26%, transparent) 0%, transparent 62%)',
          // Softer counter-light on the right, keeps it from looking one-sided.
          'radial-gradient(90% 80% at 96% 8%, color-mix(in srgb, var(--accent-soft) 85%, transparent) 0%, transparent 68%)',
          // Lift toward the bottom so the content panel has something to sit on.
          'radial-gradient(150% 110% at 50% 118%, color-mix(in srgb, var(--bg-raised) 78%, transparent) 0%, transparent 72%)',
        ].join(','),
      }}
    />
  );
}
