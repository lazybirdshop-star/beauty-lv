'use client';

import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { PublicService } from '../types';

/** Above this many services, scanning the list gets slow enough to justify a filter. */
const SEARCH_THRESHOLD = 6;

interface ServicePickerProps {
  services: PublicService[];
  selectedId: string | undefined;
  onSelect: (serviceId: string) => void;
}

function Meta({ service, muted }: { service: PublicService; muted?: boolean }) {
  return (
    <span className={cn('text-[11px]', muted ? 'text-ink-soft' : 'text-ink-soft')}>
      {service.durationMinutes} мин ·{' '}
      <span className="font-semibold text-ink">
        {formatPrice(service.priceAmountMinorUnits, service.priceCurrency)}
      </span>
    </span>
  );
}

/**
 * Collapsed by default: one row, whatever the catalogue size — a master
 * with 10 services costs exactly as much sheet height as one with 3.
 * Expands into a vertical, bounded, scrollable list rather than the
 * horizontal strip it replaces: sideways scrolling hid most of the
 * options and gave no hint they existed.
 */
export function ServicePicker({ services, selectedId, onSelect }: ServicePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = services.find((item) => item.id === selectedId) ?? services[0];
  const showSearch = services.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return services;
    return services.filter((item) => item.name.toLowerCase().includes(needle));
  }, [services, query]);

  if (!selected) return null;

  // Nothing to choose between — show it as a plain summary, not a control
  // that looks tappable but does nothing.
  if (services.length === 1) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-raised px-3.5 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold text-ink">{selected.name}</span>
          <Meta service={selected} />
        </span>
      </div>
    );
  }

  function handleSelect(serviceId: string) {
    onSelect(serviceId);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'press flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left',
          open ? 'border-accent bg-accent-soft' : 'border-border bg-bg-raised',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold text-ink">{selected.name}</span>
          <Meta service={selected} />
        </span>
        <CaretDown
          size={16}
          weight="bold"
          className={cn(
            'shrink-0 text-ink-soft transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="overflow-hidden rounded-xl border border-border bg-bg-raised">
          {showSearch ? (
            <div className="flex items-center gap-2 border-b border-border px-3.5">
              <MagnifyingGlass size={16} className="shrink-0 text-ink-soft" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Найти услугу"
                aria-label="Поиск услуги"
                className="h-11 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          ) : null}

          {/* Bounded so a long catalogue can't take over the sheet. */}
          <div className="max-h-[228px] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[13px] text-ink-soft">
                Ничего не найдено. Попробуйте другое слово или откройте раздел «Цены».
              </p>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === selected.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      'flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-accent-soft' : 'hover:bg-bg-sunken',
                    )}
                  >
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block truncate text-[14px] font-semibold',
                          isSelected ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {item.name}
                      </span>
                      <Meta service={item} />
                    </span>
                    {isSelected ? (
                      <Check size={16} weight="bold" className="shrink-0 text-accent" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
