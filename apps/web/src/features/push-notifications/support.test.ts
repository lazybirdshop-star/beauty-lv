import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectPushSupport } from './support';

/**
 * Среда тестов — node (vitest.config.mts), браузера здесь нет вовсе. Это и
 * удобно: возможности подставляются поштучно, и видно, какая именно из них
 * решает исход. Ключ добавляется в объект только когда возможность есть —
 * `'PushManager' in window` истинно и для ключа со значением `undefined`.
 */
function stubBrowser(options: {
  pushCapable: boolean;
  userAgent: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}): void {
  const navigatorStub: Record<string, unknown> = {
    userAgent: options.userAgent,
    maxTouchPoints: options.maxTouchPoints ?? 0,
  };
  const windowStub: Record<string, unknown> = {
    matchMedia: () => ({ matches: options.standalone === true }),
  };

  if (options.pushCapable) {
    navigatorStub.serviceWorker = {};
    windowStub.PushManager = function PushManager() {};
    windowStub.Notification = function Notification() {};
  }
  if (options.standalone) {
    navigatorStub.standalone = true;
  }

  windowStub.navigator = navigatorStub;
  vi.stubGlobal('window', windowStub);
  vi.stubGlobal('navigator', navigatorStub);
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124';
const IPADOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('detectPushSupport', () => {
  it('Android Chrome умеет push и без установки', () => {
    stubBrowser({ pushCapable: true, userAgent: ANDROID });

    expect(detectPushSupport()).toBe('ready');
  });

  it('вкладка Safari на iPhone — просит установить, а не отказывает', () => {
    // В обычной вкладке iOS не объявляет PushManager вовсе.
    stubBrowser({ pushCapable: false, userAgent: IPHONE });

    expect(detectPushSupport()).toBe('needs-install');
  });

  it('установленное приложение на iPhone умеет push', () => {
    stubBrowser({ pushCapable: true, userAgent: IPHONE, standalone: true });

    expect(detectPushSupport()).toBe('ready');
  });

  it('iPad распознаётся по мультитачу, хотя представляется Macintosh', () => {
    stubBrowser({ pushCapable: false, userAgent: IPADOS, maxTouchPoints: 5 });

    expect(detectPushSupport()).toBe('needs-install');
  });

  it('настольный браузер без push — это отказ, а не совет установить', () => {
    // Совет «добавьте на экран Домой» на десктопе не помог бы ничем.
    stubBrowser({ pushCapable: false, userAgent: IPADOS, maxTouchPoints: 0 });

    expect(detectPushSupport()).toBe('unsupported');
  });

  it('на сервере молчит, а не гадает', () => {
    vi.stubGlobal('window', undefined);

    expect(detectPushSupport()).toBe('unsupported');
  });
});
