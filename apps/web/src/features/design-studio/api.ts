import type { MediaDecision, PageDesign } from '@amolie/shared-kernel';

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

/**
 * Портрет — своим маршрутом и без черновика.
 *
 * Он не публикуется и не откатывается вместе с оформлением: лицо человека
 * принадлежит человеку (`organization_members.avatar_url`), а Студия решает
 * только, показывать его на странице или нет. Поэтому и запрос отдельный —
 * состояние Студии о снимке не знает вовсе.
 */
const memberBase = (slug: string) => `/organizations/${slug}/members/me`;

export function getMyAvatar(slug: string): Promise<{ avatar: MediaDecision | null }> {
  return clientApiFetch<{ avatar: MediaDecision | null }>(memberBase(slug));
}

export function saveMyAvatar(slug: string, avatar: MediaDecision): Promise<MediaDecision | null> {
  return clientApiFetch<MediaDecision | null>(`${memberBase(slug)}/avatar`, {
    method: 'PUT',
    body: JSON.stringify(avatar),
  });
}

export function clearMyAvatar(slug: string): Promise<MediaDecision | null> {
  return clientApiFetch<MediaDecision | null>(`${memberBase(slug)}/avatar`, { method: 'DELETE' });
}

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
