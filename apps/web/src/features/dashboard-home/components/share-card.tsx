'use client';

import { ArrowSquareOut, Check, Copy, QrCode } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useSyncExternalStore } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardLabel } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

/**
 * The master's own booking link — the thing she actually hands to a client,
 * and until now the one part of the growth loop with no place in the UI.
 *
 * The origin comes from the browser rather than a build-time constant so the
 * link is correct wherever this runs (localhost today, the real domain later)
 * instead of quietly showing an address that doesn't work.
 */
const noopSubscribe = () => () => {};

export function ShareCard({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  /*
   * `typeof window` read during render is the classic hydration trap: the
   * server printed «…/slug» and the first client render printed the real
   * origin, so React threw away and rebuilt this tree on every load. The
   * store reads `false` on the server and during hydration, `true` only
   * afterwards — same markup on both sides, then the real address.
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

  async function handleCopy() {
    /* The clipboard API can refuse (permissions, non-secure context) — the
       button must not claim «Скопировано» over a link that never left. */
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
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <CardLabel>{t.home.yourPage}</CardLabel>
        <p className="break-all font-mono text-[15px] text-ink">{displayUrl}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleCopy} disabled={!origin}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t.home.copied : t.home.copyLink}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setQrOpen((value) => !value)}>
          <QrCode size={16} />
          {t.home.qrCode}
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <a href={path} target="_blank" rel="noreferrer">
            <ArrowSquareOut size={16} />
            {t.home.open}
          </a>
        </Button>
        {/* Строка снятия возражения рядом с главной кнопкой — правило системы:
            3–6 слов, 13px, третьим уровнем прозрачности. */}
        <span className="text-[13px] text-ink-faint">{t.home.qrHint}</span>
      </div>

      {qrOpen && origin ? (
        <div className="flex justify-center border-t border-border pt-5">
          {/* Rendered locally as inline SVG — the master's link is never sent
              to a third-party QR service. */}
          <QRCodeSVG value={fullUrl} size={168} level="M" marginSize={2} />
        </div>
      ) : null}
    </Card>
  );
}
