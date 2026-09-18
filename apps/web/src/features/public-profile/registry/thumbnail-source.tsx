'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PublicOrganization } from '../engine/types';

/**
 * Чья страница рисуется в миниатюрах миров.
 *
 * Каталог сравнивает миры на вымышленной мастерской, пока своей страницы у
 * экрана нет. Там, где она есть (Студия, «Страница», знакомство), миниатюры
 * показывают данные заведения: «Studija Amolie · Причёска и уход · 3 услуги»
 * у салона с восемью услугами читалось чужой страницей.
 */
const ThumbnailSourceContext = createContext<PublicOrganization | undefined>(undefined);

export function ThumbnailSourceProvider({
  source,
  children,
}: {
  source: PublicOrganization | undefined;
  children: ReactNode;
}) {
  return (
    <ThumbnailSourceContext.Provider value={source}>{children}</ThumbnailSourceContext.Provider>
  );
}

export function useThumbnailSource(): PublicOrganization | undefined {
  return useContext(ThumbnailSourceContext);
}
