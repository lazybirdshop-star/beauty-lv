import {
  MAX_IMAGE_EDGE_PX,
  MAX_UPLOAD_BYTES,
  isHeicType,
  isUploadableImageType,
} from '@amolie/shared-kernel';

import { clientApiFetch } from '@/lib/client-api';

/** Минута на снимок: мобильная сеть медленная, но не бесконечная. */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Загрузка изображения: ужать в браузере, попросить подписанную ссылку,
 * положить файл прямо в хранилище (DESIGN_STUDIO.md §5.3).
 *
 * Файл не идёт через наш сервер: тело запроса упёрлось бы в предел 4.5 МБ у
 * serverless-функции Next и оплачивалось бы трафиком дважды. Сервер выдаёт
 * право положить один объект в один путь на два часа — больше ему в этой
 * операции знать нечего.
 *
 * Живёт в `lib`, а не в фиче: и Студия, и карточка услуги грузят изображения
 * одинаково и отличаются только маршрутом, за которым стоит своё право
 * доступа. Вторая копия этой последовательности разошлась бы с первой на
 * первой же правке — например, когда поменяется предел размера.
 */

/** Кто просит загрузку: за каждым — свой маршрут и своё право в API. */
export type UploadTarget = 'page' | 'service' | 'avatar';

/**
 * Путь целиком, а не хвост под общим префиксом `media/`.
 *
 * Портрет участника лежит за пределами этого префикса намеренно: маршруты
 * `media/*` охраняются правом на оформление страницы, которого у мастера
 * салона нет, а своё лицо она обязана менять сама (SALON.md §3.3).
 */
const ENDPOINT: Record<UploadTarget, string> = {
  page: 'media/image-uploads',
  service: 'media/service-image-uploads',
  avatar: 'members/me/avatar-uploads',
};

/** Причина отказа, названная кодом: текст выбирает интерфейс, на своём языке. */
export type UploadFailure = 'heic' | 'type' | 'tooLarge' | 'failed';

export class UploadError extends Error {
  constructor(readonly reason: UploadFailure) {
    super(reason);
    this.name = 'UploadError';
  }
}

interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Съёмка с телефона — это 3–8 МБ и 4000 пикселей по длинной стороне, а
 * страницу мастера открывают с телефона по мобильной сети. Лишние пиксели
 * оплачивает клиент мастера временем загрузки, поэтому кадр ужимается до
 * съёмного предела ещё до отправки.
 *
 * `imageOrientation: 'from-image'` обязателен: без него вертикальные снимки
 * с iPhone кладутся на бок — EXIF-поворот теряется при переносе на холст.
 */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new UploadError('failed');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      // WebP независимо от исходного формата: он меньше при том же качестве и
      // сохраняет прозрачность, которая нужна логотипу.
      canvas.toBlob(resolve, 'image/webp', 0.85),
    );
    if (!blob) throw new UploadError('failed');
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Возвращает публичный адрес загруженного изображения.
 *
 * Ужимание — улучшение, а не условие: если браузер не смог (нет canvas,
 * неизвестный кодек), отправляется исходный файл, и решает уже предел
 * размера. Иначе редкий браузер лишал бы мастера самой возможности.
 */
export async function uploadImage(
  slug: string,
  file: File,
  target: UploadTarget = 'page',
): Promise<string> {
  if (isHeicType(file.type)) throw new UploadError('heic');
  if (!file.type.startsWith('image/')) throw new UploadError('type');

  let payload: Blob;
  try {
    payload = await downscale(file);
  } catch {
    payload = file;
  }

  if (!isUploadableImageType(payload.type)) throw new UploadError('type');
  if (payload.size > MAX_UPLOAD_BYTES) throw new UploadError('tooLarge');

  const { uploadUrl, publicUrl } = await clientApiFetch<SignedUpload>(
    `/organizations/${slug}/${ENDPOINT[target]}`,
    {
      method: 'POST',
      body: JSON.stringify({ contentType: payload.type, byteSize: payload.size }),
    },
  );

  /*
   * Своё время, заметно больше общего предела: снимок работы уезжает в
   * хранилище целиком, и на мобильной сети минута — это норма, а не сбой.
   * Но не бесконечность: без предела зависшая отправка оставляла зону
   * загрузки в состоянии «идёт» навсегда.
   */
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      body: payload,
      headers: { 'Content-Type': payload.type },
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch {
    throw new UploadError('failed');
  }

  if (!response.ok) throw new UploadError('failed');

  return publicUrl;
}
