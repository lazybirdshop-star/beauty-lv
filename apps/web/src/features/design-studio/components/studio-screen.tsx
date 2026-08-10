'use client';

import {
  DESIGN_PRESETS,
  FONT_PRESETS,
  THEME_PRESETS,
  type DesignPresetKey,
} from '@amolie/shared-kernel';
import { ArrowLeft, ArrowSquareOut, Check, DeviceMobile, Monitor } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { updateAppearance } from '@/features/organization-profile/api';
import { DESIGN_WORLD_GROUPS } from '@/features/organization-profile/design-worlds';
import {
  designCopy,
  fontDescription,
  themeDescription,
} from '@/features/organization-profile/preset-copy';
import type { OrganizationProfile } from '@/features/organization-profile/types';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { StudioDraft } from '../draft';

import { StudioCanvas, type StudioDevice } from './studio-canvas';

function toDraft(org: OrganizationProfile): StudioDraft {
  const overrides = org.themeOverrides ?? {};
  return {
    logoUrl: org.logoUrl ?? '',
    showAvatar: org.showAvatar ?? true,
    designPresetKey: org.designPresetKey,
    themePresetKey: org.themePresetKey,
    fontPresetKey: org.fontPresetKey,
    heroStyle: org.heroStyle,
    coverUrl: org.coverUrl ?? '',
    overrideBg: overrides.bg ?? '',
    overrideBgRaised: overrides.bgRaised ?? '',
    overrideInk: overrides.ink ?? '',
    overrideAccent: overrides.accent ?? '',
    backgroundImageUrl: org.backgroundImageUrl ?? '',
  };
}

/**
 * Студия — режим, а не вкладка (DESIGN_STUDIO.md §1): экран целиком отдаётся
 * странице и её облику, выход возвращает в кабинет.
 *
 * Компоновка мобильная первой (§3.4): холст занимает верх, инспектор живёт
 * снизу и складывается; с планшета инспектор уезжает в боковую колонку 360px,
 * а холст получает остаток. Десктоп получает больше места, не больше
 * сущностей.
 *
 * Этот шаг приземляет каркас режима и живой холст. Секции инспектора —
 * идентичность, палитра и типографика: три ручки, которых достаточно, чтобы
 * холст был по-настоящему живым. Остальные ручки §5 и конвейер
 * черновик → публикация → история пока обслуживает вкладка «Оформление»;
 * пока их нет, «Опубликовать» сохраняет тем же контрактом, что и она.
 */
export function StudioScreen({ org, slug }: { org: OrganizationProfile; slug: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [published, setPublished] = useState<StudioDraft>(() => toDraft(org));
  const [draft, setDraft] = useState<StudioDraft>(() => toDraft(org));
  const [device, setDevice] = useState<StudioDevice>('phone');

  const mutation = useMutation({
    mutationFn: (input: StudioDraft) => updateAppearance(slug, input),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      setPublished(input);
    },
  });

  /* Статус говорит правду в каждый момент (§3.1, §7.1). До первой правки
     публиковать нечего, и кнопка спит. */
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(published),
    [draft, published],
  );

  function set<K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  /* Смена стиля переписывает отправные палитру и пару: набор принадлежит
     миру, и чужая палитра под ним — выбор, результат которого не увидеть. */
  function selectDesign(key: DesignPresetKey) {
    const next = DESIGN_PRESETS[key];
    setDraft((prev) => ({
      ...prev,
      designPresetKey: key,
      themePresetKey: next.themePresets.includes(prev.themePresetKey as never)
        ? prev.themePresetKey
        : next.defaultThemePreset,
      fontPresetKey: next.fontPresets.includes(prev.fontPresetKey as never)
        ? prev.fontPresetKey
        : next.defaultFontPreset,
    }));
  }

  const design = DESIGN_PRESETS[draft.designPresetKey as DesignPresetKey] ?? DESIGN_PRESETS.soft;

  const status = mutation.isPending
    ? t.studio.statusSaving
    : isDirty
      ? t.studio.statusDraft
      : t.studio.statusPublished;

  return (
    <div className="flex h-[100dvh] flex-col bg-bg-sunken">
      {/* ── Верхняя панель ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-raised px-3 py-2.5">
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/${slug}/dashboard/profile-page?tab=appearance`}>
            <ArrowLeft size={16} />
            <span className="sr-only sm:not-sr-only">{t.studio.exit}</span>
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{org.name}</p>
          <p className="truncate text-xs text-ink-soft">/{slug}</p>
        </div>

        {/* Переключатель устройства: телефон по умолчанию — другого у клиентов
            мастера в руках нет (§3.1). */}
        <div className="hidden gap-1 rounded-full bg-bg-sunken p-1 sm:flex">
          {(
            [
              { key: 'phone', icon: DeviceMobile, label: t.studio.devicePhone },
              { key: 'desktop', icon: Monitor, label: t.studio.deviceDesktop },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={device === option.key}
              aria-label={option.label}
              onClick={() => setDevice(option.key)}
              className={cn(
                'press inline-flex h-9 w-11 cursor-pointer items-center justify-center rounded-full',
                device === option.key ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
              )}
            >
              <option.icon size={18} />
            </button>
          ))}
        </div>

        <span className="hidden text-xs text-ink-soft md:inline">{status}</span>

        <Button
          size="sm"
          disabled={!isDirty || mutation.isPending}
          onClick={() => mutation.mutate(draft)}
        >
          {mutation.isPending ? t.common.saving : t.studio.publish}
        </Button>
      </header>

      {/* ── Холст + инспектор ──────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
        <main className="min-h-0 flex-1 overflow-hidden">
          <StudioCanvas slug={slug} draft={draft} device={device} title={t.studio.canvasTitle} />
        </main>

        <aside className="max-h-[46dvh] shrink-0 overflow-y-auto border-t border-border bg-bg-raised p-4 lg:max-h-none lg:w-[360px] lg:border-r lg:border-t-0">
          <div className="flex flex-col gap-5">
            {/* §5.1 Фирменный стиль — каталог по мирам, живые образы */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                {t.studio.sectionStyle}
              </h2>
              {DESIGN_WORLD_GROUPS.map((group) => (
                <div key={group.worldKey} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-ink-soft">
                    {t.pageSettings[group.labelKey]}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {group.keys.map((key) => {
                      const preset = DESIGN_PRESETS[key];
                      const isSelected = draft.designPresetKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => selectDesign(key)}
                          className={cn(
                            'press flex flex-col gap-1.5 rounded-2xl border-2 p-2 text-left',
                            isSelected
                              ? 'border-accent bg-accent-soft'
                              : 'border-border hover:border-border-strong',
                          )}
                        >
                          <WorldThumbnail
                            designPresetKey={key}
                            themePresetKey={preset.defaultThemePreset}
                            fontPresetKey={preset.defaultFontPreset}
                            height={130}
                          />
                          <span className="px-0.5 pb-0.5 text-xs font-semibold text-ink">
                            {designCopy(key, t).name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* §5.2 Акцент здесь ещё не каталог измеренных — палитра мира */}
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                {t.studio.sectionPalette}
              </h2>
              <div className="grid gap-2">
                {design.themePresets.map((key) => {
                  const preset = THEME_PRESETS[key];
                  const isSelected = draft.themePresetKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => set('themePresetKey', key)}
                      className={cn(
                        'press flex cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left',
                        isSelected ? 'border-accent bg-accent-soft' : 'border-border',
                      )}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: preset.colors.bg,
                          border: `1px solid ${preset.colors.border}`,
                        }}
                      >
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ background: preset.colors.accent }}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {preset.name}
                        </span>
                        <span className="block truncate text-xs text-ink-soft">
                          {themeDescription(key, t)}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check size={16} weight="bold" className="shrink-0 text-accent" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* §5.10 Типографика */}
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                {t.studio.sectionType}
              </h2>
              <Select
                aria-label={t.pageSettings.fontAria}
                value={draft.fontPresetKey}
                onChange={(event) => set('fontPresetKey', event.target.value)}
              >
                {design.fontPresets.map((key) => (
                  <option key={key} value={key}>
                    {FONT_PRESETS[key].name} — {fontDescription(key, t)}
                  </option>
                ))}
              </Select>
            </section>

            {/* Защита отсутствием (§2.4): о том, чего Студия не меняет, она
                молчит. Вслух — только про ручки, которых здесь пока нет. */}
            <p className="rounded-xl bg-bg-sunken px-3 py-2.5 text-xs text-ink-soft">
              {t.studio.remainingHandles}{' '}
              <Link
                href={`/${slug}/dashboard/profile-page?tab=appearance`}
                className="font-semibold text-accent underline"
              >
                {t.studio.remainingHandlesLink}
              </Link>
            </p>

            <Button variant="secondary" asChild>
              <a href={`/${slug}`} target="_blank" rel="noreferrer">
                <ArrowSquareOut size={16} />
                {t.pageSettings.openPage}
              </a>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
