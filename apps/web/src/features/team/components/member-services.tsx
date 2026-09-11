'use client';

/**
 * Услуги человека — прайс организации переключателями.
 *
 * Своя цена и длительность здесь только названы, а задаются в карточке
 * услуги: там их видно рядом с ценой прайса и с коллегами, у которых своя, — и
 * вторая форма тех же чисел разошлась бы с первой.
 *
 * Переключатель срабатывает сразу, без «Сохранить»: набор короткий, ошибка
 * обратима тем же нажатием, а экран с несохранённым состоянием у списка из
 * двадцати галочек теряет его при первом уходе со страницы. Отказ сервера
 * возвращает переключатель на место и говорит причину.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDuration, formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { listMemberServices, replaceMemberServices, type MemberService } from '../member-api';

export function MemberServices({
  slug,
  memberId,
  memberName,
  editable,
}: {
  slug: string;
  memberId: string;
  memberName: string;
  /** Право на прайс; без него список только читается. */
  editable: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const cache = useQueryClient();
  const key = ['team', slug, 'member', memberId, 'services'];

  const query = useQuery({
    queryKey: key,
    queryFn: () => listMemberServices(slug, memberId),
  });

  const save = useMutation({
    mutationFn: (next: MemberService[]) =>
      replaceMemberServices(
        slug,
        memberId,
        next
          .filter((service) => service.performs)
          .map((service) => ({
            serviceId: service.serviceId,
            priceOverrideAmount: service.priceOverrideAmount,
            durationOverrideMinutes: service.durationOverrideMinutes,
          })),
      ),
    onMutate: async (next) => {
      await cache.cancelQueries({ queryKey: key });
      const previous = cache.getQueryData<MemberService[]>(key);
      cache.setQueryData(key, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous) cache.setQueryData(key, context.previous);
      toast({ message: describeApiError(error, t), tone: 'danger' });
    },
    onSuccess: (saved) => {
      cache.setQueryData(key, saved);
      /* Исполнители услуги видны и в её карточке, и в прайсе («от» у цены). */
      void cache.invalidateQueries({ queryKey: ['service-performers', slug] });
      void cache.invalidateQueries({ queryKey: ['services', slug] });
    },
  });

  function toggle(serviceId: string, performs: boolean) {
    const current = cache.getQueryData<MemberService[]>(key) ?? [];
    save.mutate(
      current.map((service) =>
        service.serviceId === serviceId ? { ...service, performs } : service,
      ),
    );
  }

  return (
    <section className="card member-card" aria-labelledby="member-services">
      <div className="member-card__head">
        <h2 id="member-services" className="t-section">
          {t.team.servicesTitle}
        </h2>
        <p className="t-meta">{editable ? t.team.servicesHint : t.team.servicesReadOnly}</p>
      </div>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : query.data.length === 0 ? (
        <p className="t-meta">{t.team.servicesEmpty}</p>
      ) : (
        <div>
          {query.data.map((service) => {
            /* Сначала прайс, затем то, чем человек от него отличается: иначе
               «45 € · своя цена 45 €» повторяло одно число дважды и прятало,
               сколько стоит услуга у остальных. */
            const details = [
              formatDuration(service.durationMinutes, t.common),
              formatPrice(service.priceAmount, service.priceCurrency, locale),
              service.performs && service.priceOverrideAmount !== null
                ? fmt(t.team.ownPrice, {
                    price: formatPrice(service.priceOverrideAmount, service.priceCurrency, locale),
                  })
                : null,
              service.performs && service.durationOverrideMinutes !== null
                ? fmt(t.team.ownDuration, {
                    duration: formatDuration(service.durationOverrideMinutes, t.common),
                  })
                : null,
              service.isActive ? null : t.team.serviceHidden,
            ];
            return (
              <div className="member-service" key={service.serviceId}>
                <div className="member-service__text">
                  <span className={service.performs ? 't-strong' : 't-strong muted'}>
                    {service.name}
                  </span>
                  <span className="t-meta">{details.filter(Boolean).join(' · ')}</span>
                </div>
                <Switch
                  checked={service.performs}
                  disabled={!editable}
                  onCheckedChange={(next) => toggle(service.serviceId, next)}
                  label={fmt(t.team.performs, { name: `${memberName} — ${service.name}` })}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
