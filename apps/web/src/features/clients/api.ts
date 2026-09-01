import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

/**
 * An empty optional field must reach the API as `null`, never as `''`.
 * `@IsOptional()` only skips `undefined`, so an empty string was handed to
 * `@IsEmail` and came back 400 — which the screen then reported as "a client
 * with this phone already exists", a message about a rule that had not been
 * broken.
 */
function toPayload(values: object) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
  );
}

import type { Booking } from '../bookings/types';
import type { Client, ClientFormValues } from './types';

/** Клиент, ещё ни разу не записывавшийся, — и он же ответ старого API. */
const NO_VISITS = { totalBookings: 0, lastVisitAt: null };

/**
 * Адресная книга — со счётом визитов у каждой строки.
 *
 * `visitStats` подставляется, если его нет в ответе, и это не перестраховка на
 * всякий случай. Веб и API в этом проекте деплоятся **раздельно**: Vercel
 * поднимает веб из `main` сам, Fly ждёт ручного `fly deploy`. Значит между
 * двумя деплоями существует окно, в котором новый кабинет разговаривает со
 * старым API, — и без этой строки экран клиентов в этом окне падал бы с
 * `Cannot read properties of undefined`, потому что список рисует
 * `client.visitStats.totalBookings`.
 *
 * Цена — одна строка; цена ошибки — белый экран на разделе, который мастер
 * открывает каждый день. Когда API обновлён, поле приходит и подстановка не
 * срабатывает ни разу.
 */
export async function listClients(slug: string, window: TimeWindow = {}): Promise<Client[]> {
  /* Отрезок необязателен: раздел «Клиенты» спрашивает всю книгу, потому что
     она там и нужна вся. Экраны, которым книга нужна только чтобы подписать
     видимые записи именем и значком, называют своё окно — и получают единицы
     строк вместо сотен. */
  const clients = await clientApiFetch<Client[]>(
    `/organizations/${slug}/clients${timeWindowQuery(window)}`,
  );
  return clients.map((client) => ({ ...client, visitStats: client.visitStats ?? NO_VISITS }));
}

/**
 * История визитов одного клиента — для открытой карточки.
 *
 * По id, а не по телефону: номер — персональные данные, и в строке запроса,
 * логах прокси и истории браузера ему делать нечего. Сервер сам достаёт его из
 * адресной книги своей организации.
 *
 * Тот же маршрут списка записей, суженный третьим ситом: карточка клиента — не
 * отдельная сущность, а вопрос «покажи записи вот этого человека».
 */
export function listClientBookings(slug: string, clientId: string): Promise<Booking[]> {
  return clientApiFetch<Booking[]>(
    `/organizations/${slug}/bookings?clientId=${encodeURIComponent(clientId)}`,
  );
}

export function createClient(slug: string, values: ClientFormValues): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients`, {
    method: 'POST',
    body: JSON.stringify(toPayload(values)),
  });
}

export function updateClient(
  slug: string,
  clientId: string,
  values: Partial<ClientFormValues>,
): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients/${clientId}`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(values)),
  });
}

/**
 * Склеить две карточки одного человека.
 *
 * В адресе — та, что останется; в теле — поглощаемая. Так читается сам запрос:
 * «в этого клиента влить вот того».
 */
export function mergeClients(slug: string, keepId: string, mergeId: string): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients/${keepId}/merge`, {
    method: 'POST',
    body: JSON.stringify({ mergeId }),
  });
}

export function deleteClient(slug: string, clientId: string): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>(`/organizations/${slug}/clients/${clientId}`, {
    method: 'DELETE',
  });
}

export function setClientBlocked(
  slug: string,
  clientId: string,
  isBlocked: boolean,
): Promise<Client> {
  return clientApiFetch<Client>(`/organizations/${slug}/clients/${clientId}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ isBlocked }),
  });
}
