'use client';

import { useSyncExternalStore } from 'react';

import {
  deviceGuestSnapshot,
  deviceVisitsSnapshot,
  noDeviceGuest,
  noDeviceVisits,
  subscribeToDeviceMemory,
  type DeviceGuest,
  type DeviceVisit,
} from './device-visits';

/**
 * Записи, которые помнит этот браузер.
 *
 * Через `useSyncExternalStore`, а не через эффект с `setState`: у сервера
 * этой памяти нет, и он честно отдаёт пустоту, а клиент подхватывает своё
 * при гидратации — без лишнего кадра с заведомо неверным списком.
 */
export function useDeviceVisits(): DeviceVisit[] {
  return useSyncExternalStore(subscribeToDeviceMemory, deviceVisitsSnapshot, noDeviceVisits);
}

/** Как человек представлялся на этом устройстве в последний раз. */
export function useDeviceGuest(): DeviceGuest | null {
  return useSyncExternalStore(subscribeToDeviceMemory, deviceGuestSnapshot, noDeviceGuest);
}
