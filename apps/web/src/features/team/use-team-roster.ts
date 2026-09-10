'use client';

import { useQuery } from '@tanstack/react-query';

import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { listTeam } from './api';
import type { TeamMember } from './types';

/**
 * Кто работает — для календаря и форм, а не для раздела «Команда».
 *
 * Ключ лежит под префиксом `['team', slug]`: смена роли, приглашение или
 * отстранение в разделе гасят его тем же вызовом, что и собственный список
 * раздела, — и колонка ушедшего человека не остаётся в календаре до
 * перезагрузки.
 *
 * Отстранённые не отсеиваются здесь: за ними могут стоять уже проданные часы,
 * и решать, показывать ли их колонку, должен тот, кто знает про эти часы.
 */
export function useTeamRoster(slug: string, enabled: boolean) {
  const timeZone = useTimeZone();
  return useQuery({
    queryKey: ['team', slug, 'roster'],
    queryFn: () => listTeam(slug, dayWindow(new Date(), timeZone)),
    enabled,
    /* Состав меняется раз в недели, а спрашивают его на каждом открытии
       календаря и формы записи. */
    staleTime: 5 * 60_000,
  });
}

/** Кого можно выбрать в форме: только работающих, в порядке прихода в команду. */
export function selectableMembers(
  members: TeamMember[] | undefined,
): { id: string; name: string }[] {
  return (members ?? [])
    .filter((member) => member.status === 'active')
    .map((member) => ({ id: member.id, name: member.name }));
}
