'use client';

/**
 * Карточка «Ваша страница записи» — по артборду `Main.dc.html`.
 *
 * Адрес в моноширинном поле, под ним три действия: скопировать, поделиться,
 * QR-код. Значок «Опубликована» справа от заголовка — это ответ на вопрос,
 * который мастер задаёт себе чаще всего: работает ли ссылка, которую она
 * только что кому-то дала.
 *
 * Адрес читается у браузера, а не собирается из константы сборки: продукт
 * открывают и на localhost, и на своём домене, и напечатанный не тот адрес
 * хуже, чем никакого.
 */
import { QRCodeSVG } from 'qrcode.react';
import { useState, useSyncExternalStore } from 'react';

import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';

const noopSubscribe = () => () => {};

export function BookingPageCard({ slug, published }: { slug: string; published: boolean }) {
  const t = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  /*
   * `typeof window` во время отрисовки — классическая ловушка гидратации:
   * сервер печатал «…/slug», первый кадр в браузере — настоящий адрес, и React
   * выбрасывал и пересобирал это поддерево на каждой загрузке. Хранилище
   * отдаёт `false` на сервере и во время гидратации и `true` только после.
   */
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const path = `/${slug}`;
  const origin = mounted ? window.location.origin : '';
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
    <div className="card" style={{ padding: '16px 18px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="t-section" style={{ fontSize: 15 }}>
          {t.home.yourPage}
        </span>
        <span className={published ? 'badge b-green' : 'badge b-neutral'}>
          <span className="dot" />
          {published ? t.home.published : t.home.notPublished}
        </span>
      </div>

      <div className="col" style={{ gap: 10, minWidth: 0 }}>
        <a
          className="row"
          href={path}
          target="_blank"
          rel="noreferrer"
          style={{
            gap: 8,
            height: 38,
            padding: '0 10px 0 12px',
            border: '1px solid var(--hair)',
            borderRadius: 10,
            background: 'var(--warm)',
            color: 'var(--ink)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 13,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayUrl}
          </span>
          <Icon name="external" className="ico-16 muted" title={t.home.open} />
        </a>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={copy}
            disabled={!origin}
          >
            <Icon name={copied ? 'check' : 'copy'} className="ico-18" />
            <span>{copied ? t.home.copied : t.home.copyLink}</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={share}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              borderTop: '1px solid var(--hair)',
              paddingTop: 14,
            }}
          >
            {/* Рисуется здесь же, разметкой: ссылка мастера не уезжает в
                чужой сервис генерации QR. */}
            <QRCodeSVG value={fullUrl} size={168} level="M" marginSize={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
