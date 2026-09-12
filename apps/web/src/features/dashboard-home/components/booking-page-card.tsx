'use client';

/**
 * «Ваша страница записи»: адрес, «Скопировать», «Поделиться» и QR-код.
 *
 * Стоит наверху раздела «Страница» (R-19): ссылка нужна раз в неделю — у
 * зеркала, в переписке, распечаткой, — и её место рядом с тем, что она
 * представляет, а не над днём на главной. Значок «Опубликована» отвечает на
 * вопрос, который задают себе чаще всего: сработает ли ссылка, которую
 * только что кому-то дали.
 *
 * Адрес — от хоста, с которого открыт кабинет (`usePageOrigin`): продукт
 * открывают и на localhost, и на своём домене, и напечатанный не тот адрес
 * хуже, чем никакого.
 */
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="page-card" aria-labelledby="page-card-title">
      <CardHeader>
        <CardTitle id="page-card-title">{t.home.yourPage}</CardTitle>
        <Badge tone={published ? 'success' : 'neutral'}>
          {published ? t.home.published : t.home.notPublished}
        </Badge>
      </CardHeader>

      <a className="page-card__url" href={path} target="_blank" rel="noreferrer">
        <span className="tnum">{displayUrl}</span>
        <Icon name="external" className="ico-16" title={t.home.open} />
      </a>

      <div className="flex flex-wrap gap-2 pt-4">
        <Button variant="secondary" size="sm" disabled={!origin} onClick={() => void copy()}>
          <Icon name={copied ? 'check' : 'copy'} className="ico-18" />
          <span>{copied ? t.home.copied : t.home.copyLink}</span>
        </Button>
        <Button variant="secondary" size="sm" disabled={!origin} onClick={() => void share()}>
          <Icon name="share" className="ico-18" />
          <span>{t.home.share}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQrOpen((open) => !open)}
          aria-expanded={qrOpen}
        >
          <Icon name="grid" className="ico-18" />
          <span>{t.home.qrCode}</span>
        </Button>
      </div>

      {qrOpen && origin ? (
        <div className="flex justify-center pt-4">
          {/* Рисуется здесь же, разметкой: ссылка мастера не уезжает в чужой
              сервис генерации QR. */}
          <QRCodeSVG value={fullUrl} size={168} level="M" marginSize={2} />
        </div>
      ) : null}
    </Card>
  );
}
