'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Что платформа уже знает о пришедшем — глазами формы записи.
 *
 * Ровно те поля, которые форма спрашивает. Почты здесь нет и не будет: у
 * клиента её не собирают, а адрес аккаунта принадлежит платформе, не мастеру.
 */
export interface KnownGuest {
  fullName: string;
  phone: string | null;
}

const KnownGuestContext = createContext<KnownGuest | null>(null);

/**
 * Личность посетителя публичной страницы — на всю страницу сразу.
 *
 * Контекстом, а не пропом: шторка записи открывается из календаря, из прайса
 * и со страницы статуса, живёт в шести мирах и создаётся в каждом своим
 * хостом. Протаскивать один и тот же факт через все эти руки значило бы
 * шесть раз повторить одно и то же и разойтись на седьмом.
 */
export function KnownGuestProvider({
  guest,
  children,
}: {
  guest: KnownGuest | null;
  children: ReactNode;
}) {
  const value = useMemo(() => guest, [guest]);
  return <KnownGuestContext.Provider value={value}>{children}</KnownGuestContext.Provider>;
}

/**
 * `null` — обычное дело, а не ошибка: страница мастера открыта гостем, или
 * это холст Студии, где посетителя нет вовсе. Поэтому, в отличие от
 * `useComposition`, отсутствие провайдера здесь не исключение.
 */
export function useKnownGuest(): KnownGuest | null {
  return useContext(KnownGuestContext);
}
