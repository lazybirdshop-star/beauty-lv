'use client';

export type WorkspaceAction =
  | { kind: 'booking'; date?: string; time?: string; clientId?: string; memberId?: string }
  | { kind: 'client' }
  | { kind: 'search' };
export const WORKSPACE_ACTION = 'amolie:workspace-action';

export function openWorkspaceAction(action: WorkspaceAction) {
  window.dispatchEvent(new CustomEvent<WorkspaceAction>(WORKSPACE_ACTION, { detail: action }));
}
