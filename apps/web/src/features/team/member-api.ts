import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

import type { TeamMember } from './types';

/** Один человек команды — для его страницы. */
export interface TeamMemberDetail extends TeamMember {
  /** Будущие визиты за человеком: ждущие ответа и подтверждённые. */
  upcoming: number;
  /** Когда человек пришёл в организацию. */
  joinedAt: string;
}

/** Услуга прайса глазами одного мастера. */
export interface MemberService {
  serviceId: string;
  name: string;
  durationMinutes: number;
  priceAmount: number;
  priceCurrency: string;
  priceType: 'fixed' | 'from';
  /** Услуга снята с прайса — мастер может её оказывать, но клиенты её не видят. */
  isActive: boolean;
  performs: boolean;
  /** `null` — как в прайсе, а не «бесплатно». */
  priceOverrideAmount: number | null;
  durationOverrideMinutes: number | null;
}

export interface MemberServiceInput {
  serviceId: string;
  priceOverrideAmount: number | null;
  durationOverrideMinutes: number | null;
}

/** Окно суток — с этой стороны: «сегодня» считается по часам салона. */
export function getMember(
  slug: string,
  memberId: string,
  window: TimeWindow,
): Promise<TeamMemberDetail> {
  return clientApiFetch<TeamMemberDetail>(
    `/organizations/${slug}/team/${memberId}${timeWindowQuery(window)}`,
  );
}

export function listMemberServices(slug: string, memberId: string): Promise<MemberService[]> {
  return clientApiFetch<MemberService[]>(`/organizations/${slug}/team/${memberId}/services`);
}

/** Полная замена набора: страница показывает прайс галочками целиком. */
export function replaceMemberServices(
  slug: string,
  memberId: string,
  services: MemberServiceInput[],
): Promise<MemberService[]> {
  return clientApiFetch<MemberService[]>(`/organizations/${slug}/team/${memberId}/services`, {
    method: 'PUT',
    body: JSON.stringify({ services }),
  });
}

/** Имя в салоне; пусто — имя аккаунта. */
export function renameMember(slug: string, memberId: string, displayName: string | null) {
  return clientApiFetch(`/organizations/${slug}/team/${memberId}/name`, {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}
