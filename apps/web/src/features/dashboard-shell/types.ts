import type { Icon } from '@phosphor-icons/react';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: Icon;
  /** False for screens not built yet — shell still lists them (see the approved screen map) but routes to a honest "coming soon" placeholder. */
  ready: boolean;
}
