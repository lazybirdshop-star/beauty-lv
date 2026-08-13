/**
 * The product baseline: the motion and geometry every world starts from.
 *
 * A world is an identity in five dimensions, and two of them — how it moves
 * and what silhouette it speaks — are tokenised exactly like colours: one
 * vocabulary, different values. A world that has nothing of its own to say
 * about choreography or shape takes the constants here, and a world that
 * does (Luxury, AURA, FUNK) carries its own next to its palette.
 *
 * `theme.ts` imports these for the two classic worlds, so the values live in
 * exactly one place (values flow this module → theme.ts; theme.ts lends this
 * module only types, which compile away — no runtime cycle).
 */

import type { DesignMotion, DesignShape, DesignType } from './theme.js';

/** The shared choreography: the expo curve, the 380/200ms sheet, press 0.97. */
export const BASELINE_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.16, 1, 0.3, 1)',
  durHover: '150ms',
  durPress: '180ms',
  durReveal: '600ms',
  durSheetIn: '380ms',
  durSheetOut: '200ms',
  durOverlayIn: '260ms',
  durOverlayOut: '180ms',
  ampY: '24px',
  staggerStep: '60ms',
  pressScale: '0.97',
  sheetY: '32px',
  sheetScale: '0.96',
  overlayTint: '42%',
  overlayBlur: '0px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

/** The panel tree's geometry: circles and pills, a raised active pill. */
export const PANEL_TREE_SHAPE: DesignShape = {
  cellRadius: '9999px',
  chipRadius: '9999px',
  avatarRadius: 'var(--media-radius)',
  mediaMask: 'none',
  navActiveBg: 'var(--bg-raised)',
  navActiveLine: '0px',
  actionCase: 'none',
  actionTracking: '0em',
  handleWidth: '40px',
  handleHeight: '2px',
  handleRadius: '0px',
};

/** The poster tree's geometry: squares, a 2px accent underline, caps. */
export const POSTER_TREE_SHAPE: DesignShape = {
  cellRadius: '0px',
  chipRadius: '0px',
  avatarRadius: '0px',
  mediaMask: 'none',
  navActiveBg: 'transparent',
  navActiveLine: '2px',
  actionCase: 'uppercase',
  actionTracking: '0.1em',
  handleWidth: '40px',
  handleHeight: '2px',
  handleRadius: '0px',
};

/** The shared display step: the face at its authored weight, the product's tight tracking. */
export const BASELINE_TYPE: DesignType = {
  displayWeight: 'inherit',
  displayTracking: '-0.025em',
};
