'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { getMyOrganization, updateProfile } from '@/features/organization-profile/api';
import { PagePreview } from '@/features/organization-profile/components/page-preview';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { listServices, updateService } from '../api';
import { listServiceCategories } from '../categories-api';
import type { Service, ServiceCategory } from '../types';

/** Строка настройки — `.switch-row` прототипа: подпись слева, тумблер справа. */
function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="switch-row">
      <span className="switch-row__text">
        <b>{label}</b>
        {hint ? <span>{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

/**
 * «Предпросмотр» — вкладка «Услуг» по прототипу «Кабинет 2026».
 *
 * Слева настоящая страница записи во фрейме — на телефоне она первая: вкладка
 * отвечает на вопрос «что видит клиент», и ответ показывается раньше
 * настроек. Справа — как показывать прайс (цены, длительность, разделы) и
 * что из услуг видно клиенту сейчас.
 *
 * Тумблер у услуги — не редактирование, а ответ на «видно ли её»: полная
 * правка живёт на вкладке «Список».
 */
export function PricingScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const servicesKey = ['services', slug];

  const services = useQuery({ queryKey: servicesKey, queryFn: () => listServices(slug) });
  const categories = useQuery({
    queryKey: ['service-categories', slug],
    queryFn: () => listServiceCategories(slug),
  });
  const organization = useQuery({ queryKey: ['organization'], queryFn: getMyOrganization });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateService(slug, id, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: servicesKey }),
    /* Тумблер, который щёлкнул и отъехал обратно молча, отвечает на вопрос
       «что видит клиент» неверно. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const displayMutation = useMutation({
    mutationFn: (values: {
      showPricesSection?: boolean;
      showServiceDurations?: boolean;
      groupServicesByCategory?: boolean;
    }) => updateProfile(slug, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['organization'] }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  if (services.isError) return <LoadError onRetry={() => void services.refetch()} />;
  if (services.isPending || !services.data) return <Skeleton className="h-96 w-full" />;

  const all = services.data;
  const shown = all.filter((service) => service.isActive).length;
  const org = organization.data;

  /* Группы в том же порядке, что на странице записи: категории по своему
     порядку, в конце — услуги без категории. */
  const groups: { key: string; category: ServiceCategory | null; services: Service[] }[] = [
    ...(categories.data ?? []).map((category) => ({
      key: category.id,
      category,
      services: all.filter((service) => service.categoryId === category.id),
    })),
    {
      key: 'none',
      category: null,
      services: all.filter((service) => !service.categoryId),
    },
  ].filter((group) => group.services.length > 0);

  return (
    <div className="showcase-grid">
      {/* Настоящая страница во фрейме, а не её изображение: изображение
          стареет с первой же правкой. */}
      <section className="card showcase-grid__preview">
        <PagePreview slug={slug} />
      </section>

      <Card className="showcase-grid__settings">
        <CardHeader>
          <div>
            <CardTitle>{t.services.display}</CardTitle>
            <CardHint>{t.services.captionShowcase}</CardHint>
          </div>
        </CardHeader>

        <SwitchRow
          label={t.services.showPrices}
          hint={t.services.showPricesHint}
          checked={org?.showPricesSection ?? true}
          disabled={!org || displayMutation.isPending}
          onChange={(next) => displayMutation.mutate({ showPricesSection: next })}
        />
        <SwitchRow
          label={t.services.showDurations}
          checked={org?.showServiceDurations ?? true}
          disabled={!org || displayMutation.isPending}
          onChange={(next) => displayMutation.mutate({ showServiceDurations: next })}
        />
        <SwitchRow
          label={t.services.groupByCategory}
          hint={t.services.groupByCategoryHint}
          checked={org?.groupServicesByCategory ?? true}
          disabled={!org || displayMutation.isPending}
          onChange={(next) => displayMutation.mutate({ groupServicesByCategory: next })}
        />

        <h3 className="list-group__head showcase-grid__visible">
          {t.services.visibleServices}
          <span className="list-group__n tnum">
            {fmt(t.services.shownOf, { shown, total: all.length })}
          </span>
        </h3>

        {all.length === 0 ? (
          <p className="categories-hint">{t.services.pricingEmpty}</p>
        ) : (
          groups.map((group) => (
            <div className="showcase-group" key={group.key}>
              <p className="showcase-group__name">
                <span
                  className="category-dot is-small"
                  style={{ background: group.category?.color ?? 'var(--border-strong)' }}
                  aria-hidden="true"
                />
                {group.category?.name ?? t.services.withoutCategory}
              </p>
              {group.services.map((service) => (
                <div
                  className={service.isActive ? 'showcase-service' : 'showcase-service is-off'}
                  key={service.id}
                >
                  <span className="showcase-service__name">{service.name}</span>
                  <span className="showcase-service__price tnum">
                    {formatPrice(service.priceAmount, service.priceCurrency, locale)}
                  </span>
                  <Switch
                    checked={service.isActive}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(isActive) =>
                      toggleMutation.mutate({ id: service.id, isActive })
                    }
                    label={service.name}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
