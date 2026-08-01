'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { formatPrice } from '@/lib/format';

import { listServices, updateService } from '../api';
import type { Service } from '../types';

/**
 * A preview of exactly what `/{slug}/prices` shows publicly (same visual
 * shape as `public-profile/components/service-list.tsx`), with a quick
 * visibility toggle right on each row — full editing stays on the Услуги
 * screen, this one is for "what's live right now."
 */
export function PricingScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['services', slug];

  const { data: services, isLoading } = useQuery({
    queryKey,
    queryFn: () => listServices(slug),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateService(slug, id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

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
      <Card className="py-12 text-center text-sm text-ink-soft">
        Пока нет ни одной услуги — добавьте их на экране «Услуги», отсюда можно будет управлять
        видимостью в публичном прайсе.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Это ровно то, что видят клиенты на публичной странице «Цены». Выключенные услуги скрыты из
        прайса и недоступны для записи.
      </p>
      <div className="flex flex-col gap-3">
        {services.map((service: Service) => (
          <Card key={service.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{service.name}</p>
              <p className="text-sm text-ink-faint">{service.durationMinutes} мин</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-[15px] font-semibold text-ink">
                {service.priceType === 'from' ? 'от ' : ''}
                {formatPrice(service.priceAmount, service.priceCurrency)}
              </span>
              <Switch
                checked={service.isActive}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: service.id, isActive: checked })
                }
                label={`Показывать «${service.name}» в прайсе`}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
