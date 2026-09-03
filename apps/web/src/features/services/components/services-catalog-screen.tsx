'use client';

/**
 * «Услуги и цены» — по артборду `ServicesList.dc.html`.
 *
 * Одна шапка на три вкладки: «Список», «Категории», «Витрина». Кнопки
 * «Категория» и «Услуга» стоят в шапке, а не над таблицей каждой вкладки, —
 * так в макете, и так правильнее: завести услугу мастер хочет из любого вида
 * этого раздела, а не только из того, где список.
 *
 * Вкладка приезжает из строки запроса серверной страницы, поэтому
 * `/dashboard/pricing` уводит прямо на витрину и старые ссылки продолжают
 * работать.
 */
import { useState } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useT } from '@/lib/i18n';

import { CategoriesScreen } from './categories-screen';
import { PricingScreen } from './pricing-screen';
import { emitServicesAction } from './services-actions';
import { ServicesScreen } from './services-screen';

export type ServicesTab = 'list' | 'categories' | 'showcase';

interface ServicesCatalogScreenProps {
  slug: string;
  initialTab: ServicesTab;
}

const TABS: ServicesTab[] = ['list', 'categories', 'showcase'];

export function ServicesCatalogScreen({ slug, initialTab }: ServicesCatalogScreenProps) {
  const t = useT();
  const [tab, setTab] = useState<ServicesTab>(initialTab);

  const label = (key: ServicesTab) =>
    key === 'list'
      ? t.services.tabList
      : key === 'categories'
        ? t.services.tabCategories
        : t.services.tabShowcase;

  return (
    <>
      <PageHeader
        title={t.nav.services}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => emitServicesAction('category')}
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.services.addCategory}</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => emitServicesAction('service')}
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.services.addService}</span>
            </button>
          </>
        }
      />

      <div className="tabs services-tabs" role="tablist" aria-label={t.nav.services}>
        {TABS.map((key) => (
          <div
            key={key}
            role="tab"
            tabIndex={0}
            aria-selected={tab === key}
            className={tab === key ? 'is-on' : undefined}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setTab(key);
            }}
          >
            {label(key)}
          </div>
        ))}
      </div>

      {/* Вкладки размонтируются: у каждой свои запросы и своя форма, и держать
          в дереве все три ради переключения незачем. */}
      {tab === 'list' ? <ServicesScreen slug={slug} /> : null}
      {tab === 'categories' ? <CategoriesScreen slug={slug} /> : null}
      {tab === 'showcase' ? <PricingScreen slug={slug} /> : null}
    </>
  );
}
