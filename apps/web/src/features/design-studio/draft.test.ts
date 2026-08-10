import { describe, expect, it } from 'vitest';

import { applyDraft, draftFromSearchParams, draftToSearchParams, type StudioDraft } from './draft';
import type { PublicOrganization } from '@/features/public-profile/engine/types';

const BASE_DRAFT: StudioDraft = {
  logoUrl: '',
  showAvatar: true,
  designPresetKey: 'luxury',
  themePresetKey: 'bergs',
  fontPresetKey: 'jost-cormorant',
  heroStyle: 'gradient',
  coverUrl: '',
  overrideBg: '',
  overrideBgRaised: '',
  overrideInk: '',
  overrideAccent: '',
  backgroundImageUrl: '',
};

const BASE_ORG = {
  slug: 'studija',
  name: 'Studija',
  designPresetKey: 'soft-studio',
  themePresetKey: 'soft-studio',
  fontPresetKey: 'onest-playfair',
  themeOverrides: null,
  heroStyle: 'gradient',
  showAvatar: true,
  coverUrl: undefined,
  logoUrl: undefined,
  backgroundImageUrl: null,
} as unknown as PublicOrganization;

describe('draftFromSearchParams — сервер не доверяет Студии (§7.4)', () => {
  it('пропускает шестнадцатеричный цвет', () => {
    const draft = draftFromSearchParams({ ca: '#8c4a2f' });
    expect(draft.overrideAccent).toBe('#8C4A2F');
  });

  it('отбрасывает цвет, дописывающий правило в таблицу стилей', () => {
    /* Без этой проверки значение уехало бы в текст <style> как есть: адрес
       холста открыт и передаётся ссылкой, поэтому источник недоверенный. */
    const draft = draftFromSearchParams({ cb: 'red;}html{display:none}' });
    expect(draft.overrideBg).toBe('');
  });

  it('отбрасывает цвет-функцию и именованный цвет', () => {
    expect(draftFromSearchParams({ ci: 'var(--anything)' }).overrideInk).toBe('');
    expect(draftFromSearchParams({ ci: 'rebeccapurple' }).overrideInk).toBe('');
  });

  it('оставляет только http(s) в ссылках на медиа', () => {
    expect(draftFromSearchParams({ cv: 'https://cdn.example/a.jpg' }).coverUrl).toBe(
      'https://cdn.example/a.jpg',
    );
    expect(draftFromSearchParams({ cv: 'javascript:alert(1)' }).coverUrl).toBe('');
    expect(draftFromSearchParams({ cv: '/relative.jpg' }).coverUrl).toBe('');
  });

  it('читает переключатель фото как булев', () => {
    expect(draftFromSearchParams({ av: '0' }).showAvatar).toBe(false);
    expect(draftFromSearchParams({ av: '1' }).showAvatar).toBe(true);
  });

  it('отсутствующее остаётся неопределённым, а не пустым решением', () => {
    expect(draftFromSearchParams({}).designPresetKey).toBeUndefined();
  });
});

describe('draftToSearchParams', () => {
  it('не пишет в адрес пустые значения — умолчание остаётся умолчанием', () => {
    const params = draftToSearchParams(BASE_DRAFT);
    expect(params.get('d')).toBe('luxury');
    expect(params.has('cb')).toBe(false);
    expect(params.get('av')).toBe('1');
  });

  it('переживает круговой обход без потери решений', () => {
    const draft: StudioDraft = { ...BASE_DRAFT, overrideAccent: '#8C4A2F', showAvatar: false };
    const back = draftFromSearchParams(Object.fromEntries(draftToSearchParams(draft).entries()));
    expect(back.overrideAccent).toBe('#8C4A2F');
    expect(back.showAvatar).toBe(false);
    expect(back.designPresetKey).toBe('luxury');
  });
});

describe('applyDraft', () => {
  it('накрывает оформление, не трогая данные мастера', () => {
    const org = { ...BASE_ORG, name: 'Studija Amolie' } as PublicOrganization;
    const next = applyDraft(org, { designPresetKey: 'minimal' });
    expect(next.designPresetKey).toBe('minimal');
    expect(next.name).toBe('Studija Amolie');
  });

  it('пустая строка снимает переопределение, а не записывает пустой цвет', () => {
    const org = { ...BASE_ORG, themeOverrides: { accent: '#111111' } } as PublicOrganization;
    const next = applyDraft(org, { overrideAccent: '' });
    expect(next.themeOverrides).toBeNull();
  });

  it('неуказанная ручка оставляет опубликованное значение', () => {
    const org = { ...BASE_ORG, themeOverrides: { accent: '#111111' } } as PublicOrganization;
    const next = applyDraft(org, {});
    expect(next.themeOverrides).toEqual({ accent: '#111111' });
  });
});
