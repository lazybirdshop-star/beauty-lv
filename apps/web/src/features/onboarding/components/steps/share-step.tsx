'use client';

import { ArrowSquareOut, Check, Copy } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { usePageOrigin } from '@/features/public-address/use-origin';
import { useT } from '@/lib/i18n';

import { StepShell } from '../step-shell';

interface ShareStepProps {
  slug: string;
  done: boolean;
}

/**
 * The last step, and the only one whose completion belongs to somebody else:
 * a client has to book. So it hands over the two things that make that
 * happen — the link and its QR — and nothing else.
 */
export function ShareStep({ slug, done }: ShareStepProps) {
  const t = useT();
  const toast = useToast();
  const origin = usePageOrigin(`https://${t.address.origin}`);
  const [copied, setCopied] = useState(false);

  const url = `${origin}/${slug}`;
  /* Read by a person, opened by nobody — the protocol is noise here. */
  const display = url.replace(/^https?:\/\//, '');
  const path = `/${slug}`;

  async function handleCopy() {
    /* The clipboard can refuse — permissions, an insecure context — and the
       button must not claim «Скопировано» over a link that never left. */
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      toast({ message: t.home.copyFailed, tone: 'danger' });
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <StepShell
      title={t.onboarding.shareTitle}
      description={t.onboarding.shareText}
      done={done}
      doneLabel={t.onboarding.shareDone}
      footnote={t.onboarding.shareFootnote}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="rounded-3xl bg-bg-raised p-4">
          {/* Inline SVG, rendered here: the master's link is never handed to a
              third-party QR service. */}
          <QRCodeSVG value={url} size={148} level="M" marginSize={2} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="break-all font-mono text-[15px] text-ink">{display}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
              {copied ? t.home.copied : t.home.copyLink}
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href={path} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={16} />
                {t.home.open}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </StepShell>
  );
}
