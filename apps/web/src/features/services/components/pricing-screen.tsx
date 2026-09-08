'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { PagePreview } from '@/features/organization-profile/components/page-preview';
import { getMyOrganization, updateProfile } from '@/features/organization-profile/api';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { listServiceCategories } from '../categories-api';
import { listServices, updateService } from '../api';
import type { Service, ServiceCategory } from '../types';

/** Строка настройки «как показывать»: подпись слева, переключатель справа. */
function DisplayRow({
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
    <div className="showcase-row">
      <div className="col">
        <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        {hint ? (
          <span className="t-meta" style={{ fontSize: 12.5 }}>
            {hint}
          </span>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

/**
 * «Предпросмотр» — по артборду `ServicesShowcase.dc.html`.
 *
 * Три вопроса о прайсе слева — показывать ли цены, длительность и делить ли на
 * разделы, — под ними список услуг с галочками, справа настоящая страница во
 * фрейме.
 *
 * Галочка тут не редактирование услуги, а ответ на «видно ли её сейчас»:
 * полное редактирование живёт на вкладке «Список», и дублировать его здесь
 * значило бы держать две формы одной услуги.
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
    /* Экран отвечает на вопрос «что сейчас видит клиент». Галочка, которая
       щёлкнула и отъехала обратно молча, отвечает на него неверно. */
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

  /* Группы в том же порядке, что на странице записи: сначала категории по
     своему порядку, в конце — услуги без категории. */
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
      <div className="col" style={{ gap: 16 }}>
        <div className="card" style={{ padding: '4px 18px' }}>
          <div style={{ padding: '12px 0 4px' }}>
            <span className="t-section" style={{ fontSize: 15 }}>
              {t.services.display}
            </span>
          </div>
          <DisplayRow
            label={t.services.showPrices}
            hint={t.services.showPricesHint}
            checked={org?.showPricesSection ?? true}
            disabled={!org || displayMutation.isPending}
            onChange={(next) => displayMutation.mutate({ showPricesSection: next })}
          />
          <DisplayRow
            label={t.services.showDurations}
            checked={org?.showServiceDurations ?? true}
            disabled={!org || displayMutation.isPending}
            onChange={(next) => displayMutation.mutate({ showServiceDurations: next })}
          />
          <DisplayRow
            label={t.services.groupByCategory}
            hint={t.services.groupByCategoryHint}
            checked={org?.groupServicesByCategory ?? true}
            disabled={!org || displayMutation.isPending}
            onChange={(next) => displayMutation.mutate({ groupServicesByCategory: next })}
          />
        </div>

        <div className="card" style={{ padding: '12px 18px 14px' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="t-section" style={{ fontSize: 15 }}>
              {t.services.visibleServices}
            </span>
            <span className="t-meta">{fmt(t.services.shownOf, { shown, total: all.length })}</span>
          </div>

          <div className="showcase-columns">
            {groups.map((group) => (
              <div className="col" key={group.key} style={{ padding: '6px 0 4px' }}>
                <div className="row" style={{ gap: 8, padding: '6px 0' }}>
                  <span
                    className="category-dot is-small"
                    style={{ background: group.category?.color ?? 'var(--subtle-2)' }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {group.category?.name ?? t.services.withoutCategory}
                  </span>
                </div>

                {group.services.map((service) => (
                  <label className="showcase-service" key={service.id}>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: service.isActive ? undefined : 'var(--muted)',
                      }}
                    >
                      {service.name}
                    </span>
                    <span className="tnum t-meta">
                      {formatPrice(service.priceAmount, service.priceCurrency, locale)}
                    </span>
                    <input
                      type="checkbox"
                      checked={service.isActive}
                      disabled={toggleMutation.isPending}
                      onChange={(event) =>
                        toggleMutation.mutate({ id: service.id, isActive: event.target.checked })
                      }
                      aria-label={service.name}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>

          {all.length === 0 ? <p className="t-meta">{t.services.pricingEmpty}</p> : null}
        </div>
      </div>

      {/* Настоящая страница во фрейме, а не её изображение: изображение
          стареет с первой же правкой, а фрейм показывает то, что клиент
          увидит сегодня. */}
      <PagePreview slug={slug} />
    </div>
  );
}
