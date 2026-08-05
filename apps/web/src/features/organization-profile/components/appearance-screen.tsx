'use client';

import {
  CONTRAST_AA_BODY,
  contrastRatio,
  FONT_PRESETS,
  DESIGN_PRESETS,
  DESIGN_PRESET_KEYS,
  type DesignPresetKey,
  resolveThemeColors,
  THEME_PRESETS,
  DEFAULT_FONT_PRESET,
  DEFAULT_THEME_PRESET,
  type FontPresetKey,
  type ThemeOverrides,
  type ThemePresetKey,
} from '@beauty-lv/shared-kernel';
import { ArrowSquareOut, Check, Warning } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';

import { fmt, useT } from '@/lib/i18n';
import { designCopy, fontDescription, themeDescription } from '../preset-copy';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardTitle } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { updateAppearance } from '../api';
import type { AppearanceFormValues, OrganizationProfile } from '../types';

function toFormValues(org: OrganizationProfile): AppearanceFormValues {
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
  const t = useT();
  const ratio = contrastRatio(foreground, background);
  if (ratio === null || ratio >= CONTRAST_AA_BODY) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
      <Warning size={14} weight="fill" className="mt-0.5 shrink-0" />
      {fmt(t.pageSettings.contrastWarning, {
        what,
        ratio: ratio.toFixed(1),
        required: CONTRAST_AA_BODY,
      })}
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
  const t = useT();
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
          placeholder={fmt(t.pageSettings.fromPalette, { color: fallback })}
          className="font-mono"
        />
        {value ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange('')}>
            {t.pageSettings.reset}
          </Button>
        ) : null}
      </div>
      <span className="text-xs text-ink-soft">{hint}</span>
    </div>
  );
}

export function AppearanceScreen({ org, slug }: { org: OrganizationProfile; slug: string }) {
  const t = useT();
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

  const design = DESIGN_PRESETS[values.designPresetKey as DesignPresetKey] ?? DESIGN_PRESETS.poster;

  /*
   * Switching the design has to re-point the palette and the pair as well.
   * The sets belong to a design: leaving a poster palette selected under the
   * soft world would show the master a choice she cannot see the result of,
   * and the editor's swatch list would not even contain it.
   */
  function selectDesign(key: DesignPresetKey) {
    const next = DESIGN_PRESETS[key];
    setValues((prev) => ({
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <GlassCard className="flex flex-col gap-3">
        <GlassCardTitle>{t.pageSettings.photo}</GlassCardTitle>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{t.pageSettings.showPhoto}</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              {t.pageSettings.showPhotoHint}
            </span>
          </span>
          <Switch
            checked={values.showAvatar}
            onCheckedChange={(checked) => set('showAvatar', checked)}
            label={t.pageSettings.showPhoto}
          />
        </label>

        {/* The link sits with the switch that decides whether the photo is
            shown at all: both answer the same question, and having them on
            different tabs meant setting a photo and not seeing it. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appearance-logo" className="text-xs font-semibold text-ink-soft">
            {t.pageSettings.photoLink}
          </label>
          <Input
            id="appearance-logo"
            type="url"
            value={values.logoUrl}
            onChange={(event) => set('logoUrl', event.target.value)}
            placeholder="https://…"
          />
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3">
        <GlassCardTitle>{t.pageSettings.design}</GlassCardTitle>
        <p className="text-sm text-ink-soft">{t.pageSettings.designHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DESIGN_PRESET_KEYS.map((key) => {
            const preset = DESIGN_PRESETS[key];
            const isSelected = values.designPresetKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDesign(key)}
                aria-pressed={isSelected}
                className={cn(
                  'press flex flex-col items-start gap-1 rounded-2xl border-2 px-4 py-3 text-left',
                  isSelected
                    ? 'border-accent bg-accent-soft'
                    : 'border-border hover:border-border-strong',
                )}
              >
                <span className="text-[15px] font-semibold text-ink">
                  {designCopy(key, t).name}
                </span>
                <span className="text-xs text-ink-soft">{designCopy(key, t).description}</span>
                <span className="mt-1 text-[11px] text-ink-faint">
                  {fmt(t.pageSettings.designCounts, {
                    palettes: preset.themePresets.length,
                    fonts: preset.fontPresets.length,
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>
      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>{t.pageSettings.palette}</GlassCardTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {design.themePresets.map((key) => {
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
                    {preset.scheme === 'dark' ? t.pageSettings.paletteDark : ''}
                  </span>
                  <span className="block text-xs text-ink-soft">{themeDescription(key, t)}</span>
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
        <GlassCardTitle>{t.pageSettings.font}</GlassCardTitle>

        <select
          aria-label={t.pageSettings.fontAria}
          value={values.fontPresetKey}
          onChange={(event) => set('fontPresetKey', event.target.value)}
          className="h-12 w-full cursor-pointer rounded-xl border border-border bg-bg-raised px-3.5 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {design.fontPresets.map((key) => (
            <option key={key} value={key}>
              {FONT_PRESETS[key].name} — {fontDescription(key, t)}
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
            {t.pageSettings.previewLine}
          </p>
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>{t.pageSettings.banner}</GlassCardTitle>
        <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
          {[
            { key: 'gradient', label: t.pageSettings.bannerGradient },
            { key: 'image', label: t.pageSettings.bannerImage },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={values.heroStyle === option.key}
              onClick={() => set('heroStyle', option.key)}
              className={cn(
                'press inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-semibold',
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
              {t.pageSettings.imageLink}
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
              {t.pageSettings.bannerSize} <strong className="font-semibold">1600 × 900 px</strong>{' '}
              {t.pageSettings.bannerHint}
            </span>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>{t.pageSettings.background}</GlassCardTitle>
        <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
          {(
            [
              { key: 'preset', label: t.pageSettings.bgPreset },
              { key: 'color', label: t.pageSettings.bgColor },
              { key: 'image', label: t.pageSettings.bgImage },
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
                  'press inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-sm font-semibold',
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
              {t.pageSettings.imageLink}
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
              {t.pageSettings.bannerSize} <strong className="font-semibold">1920 × 1440 px</strong>
              {t.pageSettings.bgImageHint}
            </span>
          </div>
        ) : values.overrideBg ? (
          <ColorField
            id="color-bg"
            label={t.pageSettings.bgColorLabel}
            hint={t.pageSettings.bgColorHint}
            value={values.overrideBg}
            fallback={themePreset.colors.bg}
            onChange={(value) => set('overrideBg', value)}
          />
        ) : (
          <p className="text-sm text-ink-soft">
            {fmt(t.pageSettings.bgFromPalette, { color: themePreset.colors.bg })}
          </p>
        )}
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <GlassCardTitle>{t.pageSettings.ownColors}</GlassCardTitle>
        <p className="text-sm text-ink-soft">{t.pageSettings.ownColorsHint}</p>

        <ColorField
          id="color-raised"
          label={t.pageSettings.panels}
          hint={t.pageSettings.panelsHint}
          value={values.overrideBgRaised}
          fallback={preview.bgRaised}
          onChange={(value) => set('overrideBgRaised', value)}
        />
        <ColorField
          id="color-ink"
          label={t.pageSettings.textColor}
          hint={t.pageSettings.textColorHint}
          value={values.overrideInk}
          fallback={preview.ink}
          onChange={(value) => set('overrideInk', value)}
        />
        <ContrastNote
          foreground={preview.ink}
          background={preview.bgRaised}
          what={t.pageSettings.textOnPanels}
        />
        <ContrastNote
          foreground={preview.ink}
          background={preview.bg}
          what={t.pageSettings.textOnBg}
        />

        <ColorField
          id="color-accent"
          label={t.pageSettings.buttons}
          hint={t.pageSettings.buttonsHint}
          value={values.overrideAccent}
          fallback={preview.accent}
          onChange={(value) => set('overrideAccent', value)}
        />
        <ContrastNote
          foreground={preview.accentContrast}
          background={preview.accent}
          what={t.pageSettings.labelOnButton}
        />
      </GlassCard>

      {/* Live preview of the resolved tokens — same resolver the page uses. */}
      <GlassCard className="flex flex-col gap-3">
        <GlassCardTitle>{t.pageSettings.preview}</GlassCardTitle>
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
              {t.pageSettings.previewService}
            </span>
            <span style={{ color: preview.inkSoft }} className="text-sm">
              60 {t.common.minutesShort}
            </span>
          </div>
          <div
            className="mt-3 rounded-full py-2.5 text-center text-sm font-semibold"
            style={{ background: preview.accent, color: preview.accentContrast }}
          >
            {t.publicPage.book}
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t.common.saving : t.pageSettings.saveAppearance}
        </Button>
        <Button variant="secondary" asChild>
          <a href={`/${slug}`} target="_blank" rel="noreferrer">
            <ArrowSquareOut size={16} />
            {t.pageSettings.openPage}
          </a>
        </Button>
        {savedAt ? <span className="text-sm text-success">{t.pageSettings.saved}</span> : null}
      </div>
    </form>
  );
}
