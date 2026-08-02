'use client';

import {
  CONTRAST_AA_BODY,
  contrastRatio,
  FONT_PRESETS,
  FONT_PRESET_KEYS,
  resolveThemeColors,
  THEME_PRESETS,
  THEME_PRESET_KEYS,
  DEFAULT_FONT_PRESET,
  DEFAULT_THEME_PRESET,
  type FontPresetKey,
  type ThemeOverrides,
  type ThemePresetKey,
} from '@beauty-lv/shared-kernel';
import { ArrowSquareOut, Check, Warning } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardTitle } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { updateAppearance } from '../api';
import type { AppearanceFormValues, OrganizationProfile } from '../types';

function toFormValues(org: OrganizationProfile): AppearanceFormValues {
  const overrides = org.themeOverrides ?? {};
  return {
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

/** Warning, not a block — the master decides, but she is told plainly. */
function ContrastNote({
  foreground,
  background,
  what,
}: {
  foreground: string;
  background: string;
  what: string;
}) {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null || ratio >= CONTRAST_AA_BODY) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
      <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
      {what} читается плохо: контраст {ratio.toFixed(1)}:1 при норме {CONTRAST_AA_BODY}:1. Возьмите
      цвет темнее или светлее — сохранить всё равно можно.
    </p>
  );
}

function ColorField({
  id,
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value || fallback}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-bg-raised p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`${fallback} — из палитры`}
          className="font-mono"
        />
        {value ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange('')}>
            Сброс
          </Button>
        ) : null}
      </div>
      <span className="text-xs text-ink-soft">{hint}</span>
    </div>
  );
}

export function AppearanceScreen({ org, slug }: { org: OrganizationProfile; slug: string }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AppearanceFormValues>(() => toFormValues(org));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (input: AppearanceFormValues) => updateAppearance(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      setSavedAt(Date.now());
    },
  });

  /** Exactly what the public page will compute — same function, no second implementation. */
  const preview = useMemo(() => {
    const overrides: ThemeOverrides = {
      ...(values.overrideBg ? { bg: values.overrideBg } : {}),
      ...(values.overrideBgRaised ? { bgRaised: values.overrideBgRaised } : {}),
      ...(values.overrideInk ? { ink: values.overrideInk } : {}),
      ...(values.overrideAccent ? { accent: values.overrideAccent } : {}),
    };
    return resolveThemeColors(values.themePresetKey, overrides);
  }, [values]);

  const themePreset =
    THEME_PRESETS[values.themePresetKey as ThemePresetKey] ?? THEME_PRESETS[DEFAULT_THEME_PRESET];
  const fontPreset =
    FONT_PRESETS[values.fontPresetKey as FontPresetKey] ?? FONT_PRESETS[DEFAULT_FONT_PRESET];

  function set<K extends keyof AppearanceFormValues>(key: K, value: AppearanceFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>Палитра</GlassCardTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {THEME_PRESET_KEYS.map((key) => {
            const preset = THEME_PRESETS[key];
            const isSelected = values.themePresetKey === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => set('themePresetKey', key)}
                className={cn(
                  'press flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left',
                  isSelected ? 'border-accent bg-accent-soft' : 'border-border bg-bg-raised',
                )}
              >
                {/* Swatch shows the actual palette, so the choice is made by
                    looking at colours rather than reading names. */}
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: preset.colors.bg,
                    border: `1px solid ${preset.colors.border}`,
                  }}
                >
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{ background: preset.colors.accent }}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-ink">
                    {preset.name}
                    {preset.scheme === 'dark' ? ' · тёмная' : ''}
                  </span>
                  <span className="block text-xs text-ink-soft">{preset.description}</span>
                </span>
                {isSelected ? (
                  <Check size={18} weight="bold" className="shrink-0 text-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        <GlassCardTitle>Шрифт</GlassCardTitle>

        <select
          aria-label="Шрифт страницы"
          value={values.fontPresetKey}
          onChange={(event) => set('fontPresetKey', event.target.value)}
          className="h-12 w-full cursor-pointer rounded-xl border border-border bg-bg-raised px-3.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {FONT_PRESET_KEYS.map((key) => (
            <option key={key} value={key}>
              {FONT_PRESETS[key].name} — {FONT_PRESETS[key].description}
            </option>
          ))}
        </select>

        {/* A native <select> cannot render each option in its own face, so the
            sample lives below it — and it deliberately shows Cyrillic and
            Latvian diacritics, the two places a fashionable font breaks. */}
        <div className="rounded-2xl bg-bg-sunken/70 px-4 py-3.5">
          <p
            className="text-[24px] leading-tight text-ink"
            style={{ fontFamily: `var(${fontPreset.displayVar})` }}
          >
            {org.name}
          </p>
          <p
            className="mt-1.5 text-sm text-ink-soft"
            style={{ fontFamily: `var(${fontPreset.sansVar})` }}
          >
            Маникюр · 60 мин · Anna Bērziņa · 10:00
          </p>
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>Баннер</GlassCardTitle>
        <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
          {[
            { key: 'gradient', label: 'Мягкий градиент' },
            { key: 'image', label: 'Своё фото' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={values.heroStyle === option.key}
              onClick={() => set('heroStyle', option.key)}
              className={cn(
                'press flex-1 cursor-pointer rounded-full py-2 text-sm font-semibold',
                values.heroStyle === option.key
                  ? 'bg-bg-raised text-ink shadow-soft'
                  : 'text-ink-soft',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {values.heroStyle === 'image' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="cover-url" className="text-xs font-semibold text-ink-soft">
              Ссылка на изображение
            </label>
            <Input
              id="cover-url"
              type="url"
              value={values.coverUrl}
              onChange={(event) => set('coverUrl', event.target.value)}
              placeholder="https://…"
            />
            {values.coverUrl.trim() ? (
              <div className="relative mt-1 h-32 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={values.coverUrl.trim()} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              </div>
            ) : null}
            <span className="text-xs text-ink-soft">
              Рекомендуемый размер — <strong className="font-semibold">1600 × 900 px</strong>{' '}
              (соотношение 16:9), до 1 МБ. Фото обрезается по центру, поэтому главное держите в
              середине кадра. Имя поверх фото затемняется автоматически.
            </span>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>Фон страницы</GlassCardTitle>
        <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
          {(
            [
              { key: 'preset', label: 'Из палитры' },
              { key: 'color', label: 'Свой цвет' },
              { key: 'image', label: 'Картинка' },
            ] as const
          ).map((option) => {
            const current = values.backgroundImageUrl
              ? 'image'
              : values.overrideBg
                ? 'color'
                : 'preset';
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={current === option.key}
                onClick={() => {
                  // The three modes are mutually exclusive — switching clears
                  // the other one so the page can't end up with a photo and a
                  // custom colour both claiming the background.
                  if (option.key === 'preset') {
                    set('overrideBg', '');
                    set('backgroundImageUrl', '');
                  } else if (option.key === 'color') {
                    set('backgroundImageUrl', '');
                    set('overrideBg', values.overrideBg || themePreset.colors.bg);
                  } else {
                    set('overrideBg', '');
                    // A single space marks "image mode chosen, URL not typed
                    // yet" — an empty string would read as "no image" and
                    // bounce the selector straight back to the palette.
                    set('backgroundImageUrl', values.backgroundImageUrl || ' ');
                  }
                }}
                className={cn(
                  'press flex-1 cursor-pointer rounded-full py-2 text-sm font-semibold',
                  current === option.key ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {values.backgroundImageUrl ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="bg-image" className="text-xs font-semibold text-ink-soft">
              Ссылка на изображение
            </label>
            <Input
              id="bg-image"
              type="url"
              value={values.backgroundImageUrl}
              onChange={(event) => set('backgroundImageUrl', event.target.value)}
              placeholder="https://…"
            />
            {values.backgroundImageUrl.trim() ? (
              <div className="relative mt-1 h-28 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={values.backgroundImageUrl.trim()}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: `${preview.bg}73` }} />
              </div>
            ) : null}
            <span className="text-xs text-ink-soft">
              Рекомендуемый размер — <strong className="font-semibold">1920 × 1440 px</strong>, до 1
              МБ. Поверх картинки лежит полупрозрачный слой цвета палитры: без него текст на
              карточках стал бы нечитаемым поверх произвольного фото.
            </span>
          </div>
        ) : values.overrideBg ? (
          <ColorField
            id="color-bg"
            label="Цвет фона"
            hint="Основной фон под всем содержимым страницы"
            value={values.overrideBg}
            fallback={themePreset.colors.bg}
            onChange={(value) => set('overrideBg', value)}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            Фон берётся из выбранной палитры — {themePreset.colors.bg}
          </p>
        )}
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>Свои цвета</GlassCardTitle>
        <p className="text-sm text-ink-soft">
          Необязательно. Пустое поле — цвет берётся из палитры.
        </p>

        <ColorField
          id="color-raised"
          label="Плашки"
          hint="Карточки услуг, панели, окно записи"
          value={values.overrideBgRaised}
          fallback={preview.bgRaised}
          onChange={(value) => set('overrideBgRaised', value)}
        />
        <ColorField
          id="color-ink"
          label="Шрифт"
          hint="Основной цвет текста"
          value={values.overrideInk}
          fallback={preview.ink}
          onChange={(value) => set('overrideInk', value)}
        />
        <ContrastNote
          foreground={preview.ink}
          background={preview.bgRaised}
          what="Текст на плашках"
        />
        <ContrastNote foreground={preview.ink} background={preview.bg} what="Текст на фоне" />

        <ColorField
          id="color-accent"
          label="Кнопки"
          hint="Кнопка записи, активные элементы"
          value={values.overrideAccent}
          fallback={preview.accent}
          onChange={(value) => set('overrideAccent', value)}
        />
        <ContrastNote
          foreground={preview.accentContrast}
          background={preview.accent}
          what="Подпись на кнопке"
        />
      </GlassCard>

      {/* Live preview of the resolved tokens — same resolver the page uses. */}
      <GlassCard className="flex flex-col gap-3">
        <GlassCardTitle>Как это выглядит</GlassCardTitle>
        <div
          className="rounded-2xl p-5"
          style={{ background: preview.bg, fontFamily: `var(${fontPreset.sansVar})` }}
        >
          <p
            className="text-[26px] leading-tight"
            style={{
              color: preview.ink,
              fontFamily: `var(${fontPreset.displayVar})`,
            }}
          >
            {org.name}
          </p>
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-xl p-3"
            style={{ background: preview.bgRaised, border: `1px solid ${preview.border}` }}
          >
            <span style={{ color: preview.ink }} className="text-sm font-semibold">
              Маникюр
            </span>
            <span style={{ color: preview.inkSoft }} className="text-sm">
              60 мин
            </span>
          </div>
          <div
            className="mt-3 rounded-full py-2.5 text-center text-sm font-semibold"
            style={{ background: preview.accent, color: preview.accentContrast }}
          >
            Записаться
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохраняем…' : 'Сохранить оформление'}
        </Button>
        <Button variant="secondary" asChild>
          <a href={`/${slug}`} target="_blank" rel="noreferrer">
            <ArrowSquareOut size={16} />
            Открыть страницу
          </a>
        </Button>
        {savedAt ? <span className="text-sm text-success">Сохранено</span> : null}
      </div>
    </form>
  );
}
