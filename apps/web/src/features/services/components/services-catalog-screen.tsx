'use client';

/**
 * «Услуги» — прототип «Кабинет 2026», экран `services`.
 *
 * Одна шапка на три вкладки: «Список», «Категории», «Предпросмотр». Кнопки
 * стоят в шапке, а не над каждой вкладкой: завести услугу хотят из любого
 * вида раздела. «Категория» — вторичная, «Услуга» — единственная розовая.
 * Вкладки — сегментом, справа подпись, что вкладка показывает.
 *
 * Вкладка приезжает из строки запроса серверной страницы, поэтому
 * `/dashboard/pricing` уводит прямо на предпросмотр и старые ссылки
 * продолжают работать.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { useT } from '@/lib/i18n';

import { CategoriesScreen } from './categories-screen';
import { PricingScreen } from './pricing-screen';
import { emitServicesAction, type ServicesAction } from './services-actions';
import { ServicesScreen } from './services-screen';

export type ServicesTab = 'list' | 'categories' | 'showcase';

interface ServicesCatalogScreenProps {
  slug: string;
  initialTab: ServicesTab;
  /** Открыть форму новой услуги сразу — пришли из «Добавить услугу». */
  startCreating?: boolean;
}

const TABS: ServicesTab[] = ['list', 'categories', 'showcase'];

export function ServicesCatalogScreen({
  slug,
  initialTab,
  startCreating = false,
}: ServicesCatalogScreenProps) {
  const t = useT();
  const [tab, setTab] = useState<ServicesTab>(initialTab);
  /* Форма, которую открыть сразу на вкладке, куда кнопка шапки переключила:
     закрытая вкладка события не слышит — её нет в дереве. */
  const [creating, setCreating] = useState<ServicesAction | null>(null);

  function create(action: ServicesAction) {
    const home: ServicesTab = action === 'service' ? 'list' : 'categories';
    if (tab === home) {
      emitServicesAction(action);
      return;
    }
    setCreating(action);
    setTab(home);
  }
  /* Наёмный мастер прайс читает, но не ведёт (SALON.md §3.3): ни кнопок, ни
     категорий, ни витрины — только список, по которому она записывает. */
  const manage = useWorkspace()?.capabilities.canManageServices ?? true;

  if (!manage) {
    /* Шапка и подпись те же, что у владелицы (прототип «Кабинет 2026»):
       экран один, отличается только тем, что его нельзя править. */
    return (
      <>
        <PageHeader title={t.nav.services} meta={t.nav.hintServices} />
        <div className="services-bar">
          <span className="services-bar__caption">{t.services.captionList}</span>
        </div>
        <ServicesScreen slug={slug} readOnly />
      </>
    );
  }

  const label: Record<ServicesTab, string> = {
    list: t.services.tabList,
    categories: t.services.tabCategories,
    showcase: t.services.tabShowcase,
  };
  const caption: Record<ServicesTab, string> = {
    list: t.services.captionList,
    categories: t.services.captionCategories,
    showcase: t.services.captionShowcase,
  };

  return (
    <>
      <PageHeader
        title={t.nav.services}
        meta={t.nav.hintServices}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => create('category')}>
              <Icon name="plus" className="ico-18" />
              <span>{t.services.headerCategory}</span>
            </Button>
            {/* На телефоне новую услугу заводят кружком «Создать» — здесь она
                не дублируется (`page-action--create`). */}
            <Button size="sm" className="page-action--create" onClick={() => create('service')}>
              <Icon name="plus" className="ico-18" />
              <span>{t.services.headerService}</span>
            </Button>
          </>
        }
      />

      <div className="services-bar">
        <Tabs
          value={tab}
          onValueChange={(next) => {
            setCreating(null);
            setTab(next as ServicesTab);
          }}
        >
          <TabsList aria-label={t.nav.services}>
            {TABS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {label[key]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="services-bar__caption">{caption[tab]}</span>
      </div>

      {/* Вкладки размонтируются: у каждой свои запросы и своя форма. */}
      {tab === 'list' ? (
        <ServicesScreen slug={slug} startCreating={startCreating || creating === 'service'} />
      ) : null}
      {tab === 'categories' ? (
        <CategoriesScreen slug={slug} startCreating={creating === 'category'} />
      ) : null}
      {tab === 'showcase' ? <PricingScreen slug={slug} /> : null}
    </>
  );
}
