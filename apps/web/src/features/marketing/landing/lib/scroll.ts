/* One Lenis instance, shared. The stage needs it to drive the snap: going
   through window.scrollTo instead would fight the smoothing rather than use it. */
import type Lenis from 'lenis';

let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

export function getLenis(): Lenis | null {
  return instance;
}

/* A section whose content resolves over a scroll track is not readable at its
   own top edge — that is merely where its animation starts. `data-resolve`
   carries the fraction of the track at which it *is* readable, so an anchor can
   land on the finished composition rather than on the first frame of it.
   `data-resolve-track` names the element that owns the track when it is not the
   section itself: the showcase animates along `#stage-track`, which it shares
   with the hero. */
export function resolvedScrollTarget(el: HTMLElement): number | null {
  const at = Number.parseFloat(el.dataset.resolve ?? '');
  if (!Number.isFinite(at)) return null;

  const trackId = el.dataset.resolveTrack;
  const track = trackId ? document.getElementById(trackId) : el;
  if (!track) return null;

  const top = track.getBoundingClientRect().top + window.scrollY;
  const span = Math.max(0, track.offsetHeight - window.innerHeight);
  return top + span * at;
}
