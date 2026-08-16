'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Пояс, в котором у организации идут сутки.
 *
 * Живёт контекстом, а не пропом: пояс — это свойство среды, в которой открыт
 * кабинет, и он нужен полутора десяткам экранов, ни один из которых не «про
 * часовые пояса». Протаскивать его пропами через календарь, список записей,
 * карточку клиента и шторки — шум в каждой сигнатуре ради одного и того же
 * значения.
 *
 * `undefined` значит «пояс устройства» и оставлен намеренно: админ-панель
 * платформы монтирует ту же оболочку, но организации у неё нет, а журнал и
 * подписки честнее показывать по часам того, кто их читает.
 */
const TimeZoneContext = createContext<string | undefined>(undefined);

export function TimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string | undefined;
  children: ReactNode;
}) {
  return <TimeZoneContext.Provider value={timeZone}>{children}</TimeZoneContext.Provider>;
}

/**
 * Пояс организации либо `undefined`. Возвращаемое значение передаётся прямо в
 * `formatTime`/`formatDateTime`/`dayKey` — все они принимают необязательный
 * пояс и без него ведут себя как раньше.
 */
export function useTimeZone(): string | undefined {
  return useContext(TimeZoneContext);
}
