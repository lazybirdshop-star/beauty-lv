/**
 * Умеет ли этот браузер вообще получать push — и если нет, то по какой
 * причине, потому что причины требуют разных слов.
 *
 * `needs-install` — не поломка и не отказ. На iOS Web Push существует только
 * для веб-приложения, добавленного на экран «Домой»: в обычной вкладке Safari
 * `PushManager` не объявлен вовсе. Мастеру нужно сказать, что делать, а не
 * «ваш браузер не поддерживается» — Safari поддерживается, просто не так.
 */
export type PushSupport = 'ready' | 'needs-install' | 'unsupported';

/**
 * iPadOS с 13-й версии представляется Macintosh, и отличить его от настольного
 * Safari можно только по наличию мультитача. На настоящем Mac push работает и
 * во вкладке, поэтому ошибка в эту сторону безобидна: подсказка про экран
 * «Домой» появится ровно тогда, когда `PushManager` отсутствует.
 */
function isApplePortable(): boolean {
  const { userAgent, maxTouchPoints } = navigator;

  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Открыт ли сайт как установленное приложение, а не как вкладка. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    /* Проприетарный флаг Safari: `display-mode` там появился позже, а
       установленные раньше приложения продолжают отвечать только им. */
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detectPushSupport(): PushSupport {
  // Серверный рендер: спрашивать некого, и молчание честнее догадки.
  if (typeof window === 'undefined') return 'unsupported';

  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    return 'ready';
  }

  /* Вкладка Safari на iPhone — самый частый случай отсутствия PushManager, и
     единственный, из которого мастер может выбраться сама. */
  if (isApplePortable() && !isStandalone()) return 'needs-install';

  return 'unsupported';
}
