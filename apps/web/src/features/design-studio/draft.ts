import type { PublicOrganization } from '@/features/public-profile/engine/types';
import type { AppearanceFormValues } from '@/features/organization-profile/types';

/**
 * Черновик Студии — решения мастера по ручкам, не итоговые токены
 * (DESIGN_STUDIO.md §2: «хранятся решения, не краски»).
 *
 * Тип не заводится собственный: черновик — это ровно те же значения, что
 * сохраняет вкладка оформления. Отдельная структура означала бы два описания
 * одного набора ручек и, рано или поздно, расхождение между тем, что мастер
 * видит на холсте, и тем, что уедет на сервер.
 */
export type StudioDraft = AppearanceFormValues;

/**
 * Имена в адресе холста. Короткие и стабильные: адрес предпросмотра
 * пересобирается на каждое медийное изменение, и длина здесь — цена кадра.
 */
const PARAM_MAP = {
  designPresetKey: 'd',
  themePresetKey: 't',
  fontPresetKey: 'f',
  overrideBg: 'cb',
  overrideBgRaised: 'cr',
  overrideInk: 'ci',
  overrideAccent: 'ca',
  heroStyle: 'h',
  coverUrl: 'cv',
  backgroundImageUrl: 'bi',
  logoUrl: 'lg',
  showAvatar: 'av',
} as const satisfies Record<keyof StudioDraft, string>;

export function draftToSearchParams(draft: StudioDraft): URLSearchParams {
  const params = new URLSearchParams();
  for (const [field, param] of Object.entries(PARAM_MAP) as [keyof StudioDraft, string][]) {
    const value = draft[field];
    if (typeof value === 'boolean') {
      params.set(param, value ? '1' : '0');
    } else if (value) {
      /* Пустая строка означает «взять из пресета» и в адрес не едет — так
         адрес остаётся коротким, а умолчание остаётся умолчанием. */
      params.set(param, value);
    }
  }
  return params;
}

/**
 * Цвет — только шестнадцатеричный литерал (§7.4: сервер Студии не доверяет).
 *
 * Значения черновика доезжают до `<style>` страницы через резолвер, который
 * подставляет их в текст правила как есть. На публичной странице источник —
 * сохранённое решение мастера, но адрес холста открыт и передаётся ссылкой,
 * поэтому здесь источник недоверенный: без этой проверки `?cb=red;}html{…`
 * дописывал бы в таблицу стилей произвольное правило. Не подошедшее не
 * чинится и не жалуется — оно просто не существует, и холст показывает
 * палитру пресета.
 */
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

/** Ссылка на медиа — только http(s) и только абсолютная. */
function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : '';
  } catch {
    return '';
  }
}

/** Разбор адреса холста обратно в черновик; отсутствующее остаётся пустым. */
export function draftFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): Partial<StudioDraft> {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const COLOR_FIELDS = ['overrideBg', 'overrideBgRaised', 'overrideInk', 'overrideAccent'];
  const URL_FIELDS = ['coverUrl', 'backgroundImageUrl', 'logoUrl'];

  const draft: Partial<StudioDraft> = {};
  for (const [field, param] of Object.entries(PARAM_MAP) as [keyof StudioDraft, string][]) {
    const raw = read(param);
    if (raw === undefined) continue;

    if (field === 'showAvatar') {
      draft.showAvatar = raw === '1';
    } else if (COLOR_FIELDS.includes(field)) {
      (draft as Record<string, string>)[field] = HEX_COLOR.test(raw) ? raw.toUpperCase() : '';
    } else if (URL_FIELDS.includes(field)) {
      (draft as Record<string, string>)[field] = safeUrl(raw);
    } else {
      /* Ключи пресетов проверять не нужно: их резолверы падают в умолчание на
         любом незнакомом значении (R7) и в текст стилей не попадают. */
      (draft as Record<string, string>)[field] = raw;
    }
  }
  return draft;
}

/**
 * Черновик поверх настоящей организации мастера.
 *
 * Данные остаются её собственными — имя, услуги, цены, расписание (§4.1):
 * черновик трогает **только** оформление. Отсюда следует и обратное: холст
 * честно покажет пустой прайс, если услуг нет, и длинное имя, если оно
 * длинное, — предпросмотр, который лжёт хоть в чём-то, хуже ссылки
 * «открыть в новой вкладке».
 */
export function applyDraft(
  org: PublicOrganization,
  draft: Partial<StudioDraft>,
): PublicOrganization {
  /* Четыре ручных цвета собираются в тот же `themeOverrides`, который читает
     резолвер страницы; пустая строка означает «не переопределять». */
  const overrides: Record<string, string> = { ...(org.themeOverrides ?? {}) };
  const overridePairs = [
    ['bg', draft.overrideBg],
    ['bgRaised', draft.overrideBgRaised],
    ['ink', draft.overrideInk],
    ['accent', draft.overrideAccent],
  ] as const;
  for (const [token, value] of overridePairs) {
    if (value === undefined) continue;
    if (value) overrides[token] = value;
    else delete overrides[token];
  }

  return {
    ...org,
    designPresetKey: draft.designPresetKey ?? org.designPresetKey,
    themePresetKey: draft.themePresetKey ?? org.themePresetKey,
    fontPresetKey: draft.fontPresetKey ?? org.fontPresetKey,
    themeOverrides: Object.keys(overrides).length > 0 ? overrides : null,
    heroStyle: draft.heroStyle ?? org.heroStyle,
    showAvatar: draft.showAvatar ?? org.showAvatar,
    coverUrl: draft.coverUrl?.trim() ? draft.coverUrl.trim() : org.coverUrl,
    logoUrl: draft.logoUrl?.trim() ? draft.logoUrl.trim() : org.logoUrl,
    backgroundImageUrl: draft.backgroundImageUrl?.trim()
      ? draft.backgroundImageUrl.trim()
      : org.backgroundImageUrl,
  };
}
