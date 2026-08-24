/**
 * Хранилище браузера для тестов.
 *
 * В jsdom этой сборки `window.localStorage` не объявлен — ровно как у
 * человека в приватном окне или с запретом на хранилище для сайта. Код
 * продукта такой случай переживает молча, поэтому тесту, который проверяет
 * саму логику памяти, хранилище нужно подставить.
 */
export function installFakeStorage(): void {
  const entries = new Map<string, string>();

  const storage: Storage = {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}
