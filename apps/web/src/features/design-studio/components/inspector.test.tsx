// @vitest-environment jsdom

import { defaultPageDesign, type PageDesign } from '@amolie/shared-kernel';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { Inspector, STUDIO_SECTIONS } from './inspector';

/**
 * Набор настроек показывается **под конкретно выбранную тему** — это и есть
 * то свойство, ради которого заведена `STYLE_LIMITS`.
 *
 * Проверяется не разметка, а обещание: мир, который портрета не рисует, не
 * предлагает его загрузить, а мир, который держит границы светом, не
 * предлагает выбрать их цвет. Пока оба факта жили в разметке миров, Студия
 * обещала мастеру то, чего страница не покажет.
 */

/* Миниатюра мира монтирует композицию целиком с её календарём — здесь она не
   проверяется, а стоила бы каждому тесту дерева реальной страницы. */
vi.mock('@/features/public-profile/registry/world-thumbnail', () => ({
  WorldThumbnail: () => null,
}));

afterEach(cleanup);

function show(design: PageDesign) {
  return render(
    <Inspector
      design={design}
      published={design}
      masterName="Анна"
      openSection={null}
      onOpenSection={() => {}}
      onChange={() => {}}
      onPreview={() => {}}
    />,
  );
}

/** Строки инспектора — то, что мастер видит закрытым списком. */
function sectionTitles() {
  return screen
    .getAllByRole('button', { expanded: false })
    .map((button) => button.textContent ?? '');
}

describe('Inspector — набор секций', () => {
  it('сводит ручки к шести вопросам', () => {
    expect(STUDIO_SECTIONS).toEqual([
      'style',
      'photos',
      'background',
      'buttons',
      'text',
      'surfaces',
    ]);
  });

  it('в мягком мире не предлагает цвет рамок: границу там несёт свет', () => {
    show(defaultPageDesign('soft'));
    const titles = sectionTitles().join(' ');
    expect(titles).toContain(ru.studio.sectionSurfaces);
    expect(titles).not.toContain(ru.studio.borderColor);
  });

  it('в плакате не предлагает портрет мастера: мира с портретом там нет', () => {
    show(defaultPageDesign('poster'));
    expect(screen.queryByText(ru.studio.showMasterPhoto)).toBeNull();
  });

  it('в мягком мире портрет предлагается', () => {
    render(
      <Inspector
        design={defaultPageDesign('soft')}
        published={defaultPageDesign('soft')}
        masterName="Анна"
        openSection="photos"
        onOpenSection={() => {}}
        onChange={() => {}}
        onPreview={() => {}}
      />,
    );
    expect(screen.getByText(ru.studio.showMasterPhoto)).toBeTruthy();
  });

  it('в плакате цвет рамок предлагается — там граница и есть линейка', () => {
    render(
      <Inspector
        design={defaultPageDesign('poster')}
        published={defaultPageDesign('poster')}
        masterName="Анна"
        openSection="surfaces"
        onOpenSection={() => {}}
        onChange={() => {}}
        onPreview={() => {}}
      />,
    );
    expect(screen.getByText(ru.studio.borderColor)).toBeTruthy();
  });

  /* ── Ручки AURA принадлежат AURA ──────────────────────────────────────
   * Мир пришёл со своим списком изменяемого (`aura.html`), и Студия обязана
   * показать ровно его. Проверяются обе стороны границы: что AURA получает
   * свои две ручки, и что ни один другой мир их не видит.
   */
  function openSection(design: PageDesign, section: 'surfaces' | 'buttons') {
    return render(
      <Inspector
        design={design}
        published={design}
        masterName="Анна"
        openSection={section}
        onOpenSection={() => {}}
        onChange={() => {}}
        onPreview={() => {}}
      />,
    );
  }

  it('в AURA предлагает тон стекла и второй цвет градиента', () => {
    openSection(defaultPageDesign('aura'), 'surfaces');
    expect(screen.getByText(ru.studio.surfaceTint)).toBeTruthy();
    cleanup();

    openSection(defaultPageDesign('aura'), 'buttons');
    expect(screen.getByText(ru.studio.accentToColor)).toBeTruthy();
  });

  it('в AURA не предлагает ни цвет рамок, ни выбор материала: мир один — стекло', () => {
    openSection(defaultPageDesign('aura'), 'surfaces');
    expect(screen.queryByText(ru.studio.borderColor)).toBeNull();
    expect(screen.queryByText(ru.studio.materialFlat)).toBeNull();
    expect(screen.queryByText(ru.studio.materialRule)).toBeNull();
  });

  it('в AURA не предлагает выбор заливки: заливка мира одна — лента градиента', () => {
    openSection(defaultPageDesign('aura'), 'buttons');
    expect(screen.queryByText(ru.studio.buttonFill)).toBeNull();
    expect(screen.queryByText(ru.studio.buttonCase)).toBeNull();
  });

  it('ручки AURA не приходят в другие миры', () => {
    for (const style of ['soft', 'poster'] as const) {
      openSection(defaultPageDesign(style), 'buttons');
      expect(screen.queryByText(ru.studio.accentToColor), style).toBeNull();
      cleanup();

      openSection(defaultPageDesign(style), 'surfaces');
      expect(screen.queryByText(ru.studio.surfaceTint), style).toBeNull();
      cleanup();
    }
  });
});
