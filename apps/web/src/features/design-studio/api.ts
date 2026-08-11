import type { PageDesign } from '@amolie/shared-kernel';

import { clientApiFetch } from '@/lib/client-api';

/** Одна публикация в истории (DESIGN_STUDIO.md §7.3). */
export interface PageDesignVersion {
  version: number;
  publishedAt: string;
  revertedFromVersion: number | null;
  design: PageDesign;
}

/** Полное состояние Студии: два состояния страницы и её история (§7.1, §7.3). */
export interface PageDesignState {
  published: PageDesign;
  draft: PageDesign;
  hasDraft: boolean;
  /** Страница ещё не переехала в Студию: её облик собран из прежних полей (§7.5). */
  archived: boolean;
  versions: PageDesignVersion[];
}

const base = (slug: string) => `/organizations/${slug}/page-design`;

export function getPageDesignState(slug: string): Promise<PageDesignState> {
  return clientApiFetch<PageDesignState>(base(slug));
}

export function savePageDesignDraft(slug: string, design: PageDesign): Promise<PageDesignState> {
  return clientApiFetch<PageDesignState>(`${base(slug)}/draft`, {
    method: 'PUT',
    body: JSON.stringify(design),
  });
}

/** «Вернуться к опубликованному» — сброс черновика одним действием. */
export function discardPageDesignDraft(slug: string): Promise<PageDesignState> {
  return clientApiFetch<PageDesignState>(`${base(slug)}/draft`, { method: 'DELETE' });
}

export function publishPageDesign(slug: string, design: PageDesign): Promise<PageDesignState> {
  return clientApiFetch<PageDesignState>(`${base(slug)}/publish`, {
    method: 'POST',
    body: JSON.stringify({ design }),
  });
}

/** Откат — новая публикация старого слепка; история продолжается. */
export function rollbackPageDesign(slug: string, version: number): Promise<PageDesignState> {
  return clientApiFetch<PageDesignState>(`${base(slug)}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ version }),
  });
}
