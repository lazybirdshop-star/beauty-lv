'use client';

/**
 * «Страница записи» — ячейка прототипа «Кабинет 2026»: QR слева, справа
 * адрес пилюлей с копированием, опубликована ли страница и «Поделиться» со
 * «Студией».
 *
 * QR виден сразу, а не по кнопке: его показывают клиенту у зеркала, и
 * лишнее нажатие в этот момент — лишнее. Значок «Опубликована» отвечает на
 * вопрос, который задают себе чаще всего: сработает ли ссылка, которую только
 * что кому-то дали.
 *
 * Адрес — от хоста, с которого открыт кабинет (`usePageOrigin`): продукт
 * открывают и на localhost, и на своём домене, и напечатанный не тот адрес
 * хуже, чем никакого.
 */
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { usePageOrigin } from '@/features/public-address/use-origin';
import { useT } from '@/lib/i18n';

export function BookingPageCard({
  slug,
  published,
}: {
  slug: string;
  /** Не знаем — не печатаем: значок состояния врать не имеет права. */
  published?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

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
    <Card className="page-card" aria-labelledby="page-card-title">
      <CardHeader>
        <CardTitle id="page-card-title">{t.workspace.pageCardTitle}</CardTitle>
        <a className="cell-link" href={path} target="_blank" rel="noreferrer">
          {t.home.open}
        </a>
      </CardHeader>

      <div className="page-card__body">
        {/* Рисуется здесь же, разметкой: ссылка мастера не уезжает в чужой
            сервис генерации QR. */}
        <div className="page-card__qr" aria-label={t.home.qrCode} role="img">
          {origin ? <QRCodeSVG value={fullUrl} size={80} level="M" marginSize={0} /> : null}
        </div>

        <div className="page-card__main">
          <div className="page-card__link">
            <span className="page-card__url tnum">{displayUrl}</span>
            <Button
              variant="ghost"
              size="icon"
              className="page-card__copy"
              disabled={!origin}
              onClick={() => void copy()}
              aria-label={copied ? t.home.copied : t.home.copyLink}
            >
              <Icon name={copied ? 'check' : 'copy'} className="ico-16" />
            </Button>
          </div>

          {published === undefined ? null : (
            <p className="page-card__status">
              <Badge tone={published ? 'success' : 'neutral'}>
                {published ? t.home.published : t.home.notPublished}
              </Badge>
            </p>
          )}

          <div className="page-card__actions">
            <Button variant="secondary" size="pill" disabled={!origin} onClick={() => void share()}>
              <Icon name="share" className="ico-16" />
              <span>{t.home.share}</span>
            </Button>
            <Button asChild variant="ghost" size="pill">
              <Link href={`/${slug}/studio`}>{t.studio.enter}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
