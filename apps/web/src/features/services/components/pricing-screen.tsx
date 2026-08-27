'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useT, useLocale } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPrice } from '@/lib/format';

import { listServices, updateService } from '../api';
import type { Service } from '../types';

/**
 * A preview of exactly what `/{slug}/prices` shows publicly (same visual
 * shape as `public-profile/compositions/poster/service-list.tsx`), with a quick
 * visibility toggle right on each row — full editing stays on the Услуги
 * screen, this one is for "what's live right now."
 */
export function PricingScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['services', slug];

  const {
    data: services,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listServices(slug),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateService(slug, id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    /* Экран отвечает на вопрос «что сейчас видит клиент». Тумблер, который
       щёлкнул и отъехал обратно молча, отвечает на него неверно. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  if (isError) {
    return <LoadError onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card className="py-12 text-center text-sm text-ink-soft">{t.services.pricingEmpty}</Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{t.services.pricingHint}</p>
      <div className="flex flex-col gap-3">
        {services.map((service: Service) => (
          <Card key={service.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{service.name}</p>
              <p className="text-sm text-ink-faint">
                {service.durationMinutes} {t.common.minutesShort}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[15px] font-semibold text-ink">
                {service.priceType === 'from' ? `${t.common.from} ` : ''}
                {formatPrice(service.priceAmount, service.priceCurrency, locale)}
              </span>
              <Switch
                checked={service.isActive}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: service.id, isActive: checked })
                }
                label={fmt(t.services.showInPricing, { name: service.name })}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
