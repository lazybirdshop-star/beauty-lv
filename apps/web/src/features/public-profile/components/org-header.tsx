import type { PublicOrganization } from '../types';

export function OrgHeader({ org }: { org: PublicOrganization }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-5">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-contrast"
        aria-hidden="true"
      >
        {org.avatarInitials}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{org.name}</h1>
        <p className="truncate text-sm text-ink-soft">{org.tagline}</p>
      </div>
    </header>
  );
}
