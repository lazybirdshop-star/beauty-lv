'use client';

import type { OrgRole } from '@amolie/shared-kernel';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  workspaceCapabilities,
  type OrganizationType,
  type WorkspaceCapabilities,
} from './capabilities';

/**
 * Кто и где работает — один раз на весь кабинет.
 *
 * Календарь, форма записи и меню «Создать» задают один и тот же вопрос: чьё это
 * «моё» и что ещё здесь можно. Ответ приходит из layout кабинета одним
 * запросом (`/organizations/me`), и тащить его пропсами через каждый экран
 * значило бы однажды забыть передать его в одну из шторок.
 */
export interface Workspace {
  slug: string;
  role: OrgRole;
  /** Место вошедшей в организации: её колонка, её окна, её записи. */
  memberId: string;
  /** Соло-мастер или салон: у соло команды нет вовсе. */
  organizationType: OrganizationType;
  /** Сколько человек сейчас работает. */
  teamSize: number;
  capabilities: WorkspaceCapabilities;
}

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  slug,
  role,
  memberId,
  organizationType,
  teamSize,
  children,
}: Omit<Workspace, 'capabilities'> & { children: ReactNode }) {
  const value = useMemo<Workspace>(
    () => ({
      slug,
      role,
      memberId,
      organizationType,
      teamSize,
      capabilities: workspaceCapabilities(role, { organizationType, teamSize }),
    }),
    [slug, role, memberId, organizationType, teamSize],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/**
 * Среда кабинета.
 *
 * `null` вне кабинета — в тестах отдельных форм и на экранах, которые рендерятся
 * без его рамы. Вызывающий обязан уметь жить без неё: форма записи без среды
 * ведёт себя как у соло-мастера, а не падает.
 */
export function useWorkspace(): Workspace | null {
  return useContext(WorkspaceContext);
}
