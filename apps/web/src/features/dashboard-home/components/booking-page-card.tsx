'use client';

/**
 * «Ваша страница записи» на «Сегодня»: адрес, «Скопировать», «Поделиться» и
 * QR-код.
 *
 * Ссылка — то, что мастер отдаёт клиентам каждый день: в переписке, в шапке
 * профиля, распечаткой у зеркала. Искать её в «Странице» ради одного
 * копирования — лишний переход каждый раз. Значок «Опубликована» отвечает на
 * вопрос, который задают себе чаще всего: сработает ли ссылка, которую только
 * что кому-то дали.
 *
 * Адрес — от хоста, с которого открыт кабинет (`usePageOrigin`), тем же
 * способом, что в шаге знакомства: продукт открывают и на localhost, и на
 * своём домене, и напечатанный не тот адрес хуже, чем никакого.
 */
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { usePageOrigin } from '@/features/public-address/use-origin';
import { useT } from '@/lib/i18n';

export function BookingPageCard({ slug, published }: { slug: string; published: boolean }) {
  const t = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const path = `/${slug}`;
  const origin = usePageOrigin('');
  const fullUrl = `${origin}${path}`;
  const displayUrl = origin ? fullUrl.replace(/^https?:\/\//, '') : `…${path}`;

  async function copy() {
    /* Буфер обмена умеет отказать (права, незащищённый контекст). Кнопка не
       имеет права сказать «Скопировано» над ссылкой, которая никуда не ушла. */
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      toast({ message: t.home.copyFailed, tone: 'danger' });
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (typeof navigator.share !== 'function') {
      await copy();
      return;
    }
    try {
      await navigator.share({ url: fullUrl });
    } catch {
      /* Отмена шторки «Поделиться» — не ошибка, и говорить о ней нечего. */
    }
  }

  return (
    <section className="today-share" aria-labelledby="today-share-title">
      <div className="today-section-head">
        <h2 id="today-share-title" className="t-section">
          {t.home.yourPage}
        </h2>
        <span className={published ? 'badge b-green' : 'badge b-neutral'}>
          <span className="dot" />
          {published ? t.home.published : t.home.notPublished}
        </span>
      </div>

      <a className="today-share__url" href={path} target="_blank" rel="noreferrer">
        <span className="mono">{displayUrl}</span>
        <Icon name="external" className="ico-16 muted" title={t.home.open} />
      </a>

      <div className="today-share__actions">
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => void copy()}
          disabled={!origin}
        >
          <Icon name={copied ? 'check' : 'copy'} className="ico-18" />
          <span>{copied ? t.home.copied : t.home.copyLink}</span>
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => void share()}
          disabled={!origin}
        >
          <Icon name="share" className="ico-18" />
          <span>{t.home.share}</span>
        </button>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => setQrOpen((open) => !open)}
          aria-expanded={qrOpen}
        >
          <Icon name="grid" className="ico-18" />
          <span>{t.home.qrCode}</span>
        </button>
      </div>

      {qrOpen && origin ? (
        <div className="today-share__qr">
          {/* Рисуется здесь же, разметкой: ссылка мастера не уезжает в чужой
              сервис генерации QR. */}
          <QRCodeSVG value={fullUrl} size={168} level="M" marginSize={2} />
        </div>
      ) : null}
    </section>
  );
}
