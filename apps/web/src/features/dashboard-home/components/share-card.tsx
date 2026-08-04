'use client';

import { ArrowSquareOut, Check, Copy, QrCode } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardTitle } from '@/components/ui/glass-card';

/**
 * The master's own booking link — the thing she actually hands to a client,
 * and until now the one part of the growth loop with no place in the UI.
 *
 * The origin comes from the browser rather than a build-time constant so the
 * link is correct wherever this runs (localhost today, the real domain later)
 * instead of quietly showing an address that doesn't work.
 */
export function ShareCard({ slug }: { slug: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const path = `/${slug}`;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const fullUrl = `${origin}${path}`;
  const displayUrl = origin ? fullUrl.replace(/^https?:\/\//, '') : `…${path}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      <div>
        <GlassCardTitle>{t.home.yourPage}</GlassCardTitle>
        <p className="mt-2 break-all font-mono text-[15px] text-ink">{displayUrl}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleCopy} disabled={!origin}>
          {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
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
      </div>

      {qrOpen && origin ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-bg-raised p-5">
          {/* Rendered locally as inline SVG — the master's link is never sent
              to a third-party QR service. */}
          <QRCodeSVG value={fullUrl} size={168} level="M" marginSize={2} />
          <p className="text-xs text-ink-soft">{t.home.qrHint}</p>
        </div>
      ) : null}
    </GlassCard>
  );
}
