'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { usePageOrigin } from '@/features/public-address/use-origin';
import { useT } from '@/lib/i18n';

/**
 * «Ваша страница: amolie.com/anna · Скопировать» — одна строка внутри
 * карточки настройки, пока настройка не закончена (R-19). Полная карточка с
 * QR живёт в разделе «Страница».
 */
export function PageLinkLine({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const path = `/${slug}`;
  const origin = usePageOrigin('');
  const fullUrl = `${origin}${path}`;
  const displayUrl = origin ? fullUrl.replace(/^https?:\/\//, '') : `…${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      toast({ message: t.home.copyFailed, tone: 'danger' });
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="page-link-line">
      <span className="type-meta">{t.home.yourPage}</span>
      <a className="link type-dense tnum" href={path} target="_blank" rel="noreferrer">
        {displayUrl}
      </a>
      <Button variant="ghost" size="pill" disabled={!origin} onClick={() => void copy()}>
        <Icon name={copied ? 'check' : 'copy'} className="ico-16" />
        <span>{copied ? t.home.copied : t.home.copyLink}</span>
      </Button>
    </div>
  );
}
