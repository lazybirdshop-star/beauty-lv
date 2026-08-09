'use client';

import { Clock } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { fmt, useT } from '@/lib/i18n';

import { formatDuration } from '../engine/booking-cart';
import { Sheet } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/format';

import type { PublicService } from '../engine/types';

interface ServiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: PublicService | null;
  /** Booking lives on the master's home page — this sheet only presents. */
  /** Opens booking with this service already chosen, instead of sending the
   *  visitor back to the schedule to start the chain over. */
  onBook: () => void;
}

export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  onBook,
}: ServiceDetailSheetProps) {
  const t = useT();
  if (!service) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={service.name}
      description={`${formatDuration(service.durationMinutes, t.publicPage)} · ${formatPrice(
        service.priceAmountMinorUnits,
        service.priceCurrency,
      )}`}
      footer={
        <Button className="h-13 w-full" onClick={onBook}>
          {t.publicPage.pickTime}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {service.imageUrl ? (
          // Masters paste an arbitrary photo URL, so this stays a plain <img>
          // rather than opening next/image's optimizer to any remote host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imageUrl}
            alt={fmt(t.publicPage.workExample, { name: service.name })}
            loading="lazy"
            className="h-56 w-full rounded-2xl object-cover"
          />
        ) : null}

        {service.description ? (
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {service.description}
          </p>
        ) : (
          <p className="text-[15px] text-ink-soft">{t.publicPage.noDescription}</p>
        )}

        <div className="flex items-center gap-2.5 rounded-2xl bg-bg-sunken/70 px-4 py-3">
          <Clock size={18} weight="fill" className="shrink-0 text-accent" />
          <span className="text-sm text-ink-soft">
            {t.publicPage.duration} — {formatDuration(service.durationMinutes, t.publicPage)}
          </span>
        </div>
      </div>
    </Sheet>
  );
}
