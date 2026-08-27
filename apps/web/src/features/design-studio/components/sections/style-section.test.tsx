// @vitest-environment jsdom

import { defaultPageDesign } from '@amolie/shared-kernel';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@/lib/i18n';

import { StyleSection } from './style-section';

/*
 * Секция монтирует живые миниатюры миров, а те читают адрес страницы через
 * роутер. Роутера в тестовой среде нет — подменяем пустым: этот тест
 * проверяет разметку выбора, а не то, что просит адрес.
 */
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => undefined }),
  usePathname: () => '/anna',
}));

/**
 * Каталог миров — разметка выбора (FIX.md F-07).
 *
 * Плитка мира показывает **живой** мир: тот же `CalendarHost`, что стоит на
 * публичной странице, со своими кнопками «Предыдущий месяц». Обёртка-кнопка
 * давала кнопку внутри кнопки — разметку, которую браузер не вкладывает, а
 * закрывает, — 34 вложенные кнопки на страницу и ошибку гидратации. `inert`
 * снимал вопрос доступности и не чинил ни разметку, ни гидратацию.
 *
 * Поэтому проверяется именно дерево, а не «работает ли нажатие»: дефект был
 * не в поведении.
 */
afterEach(cleanup);

function renderSection(onChange = vi.fn()) {
  const design = defaultPageDesign('soft');
  render(
    <I18nProvider locale="ru">
      <StyleSection design={design} onChange={onChange} onPreview={() => undefined} />
    </I18nProvider>,
  );
  /* Групп в секции две — миры и прочтение земли, — и все проверки ниже
     говорят про первую: свойства у них одни, а смешивать их счёт нельзя. */
  const worlds = within(screen.getAllByRole('radiogroup')[0]!);
  return { onChange, worlds };
}

describe('StyleSection — каталог миров', () => {
  it('не вкладывает кнопку в кнопку', async () => {
    const { worlds } = renderSection();

    /* Мир приезжает своим чанком (`next/dynamic`), поэтому сначала дожидаемся
       его кнопок: без смонтированного мира внутри плитки не было бы и
       вложенных кнопок, и «дефекта нет» читалось бы как «дефект исправлен». */
    await waitFor(() => {
      const inside = worlds
        .getAllByRole('radio')
        .flatMap((radio) => [...radio.querySelectorAll('button')]);
      expect(inside.length).toBeGreaterThan(0);
    });

    for (const button of document.querySelectorAll('button')) {
      expect(button.querySelector('button')).toBeNull();
    }
  });

  it('выбор мира — группа переключателей, а не набор нажатых кнопок', () => {
    const { worlds } = renderSection();

    // `aria-checked` вместо `aria-pressed`: читалка произносит «выбрана», а не
    // «нажата», и выбор здесь взаимоисключающий.
    expect(worlds.getAllByRole('radio').length).toBeGreaterThan(1);
  });

  it('выбранный мир отмечен ровно один', () => {
    const { worlds } = renderSection();

    const checked = worlds
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
  });

  it('Tab приводит к выбранному, а не прощёлкивает все миры', () => {
    const { worlds } = renderSection();

    // Бродячий tabindex — то же, что браузер делает с нативной группой.
    const focusable = worlds
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('tabindex') === '0');
    expect(focusable).toHaveLength(1);
  });

  it('нажатие выбирает мир', () => {
    const { onChange, worlds } = renderSection();

    fireEvent.click(worlds.getAllByRole('radio')[1]!);

    expect(onChange).toHaveBeenCalled();
  });

  it('стрелка ведёт по группе и выбирает на ходу', () => {
    const { onChange, worlds } = renderSection();
    const radios = worlds.getAllByRole('radio');
    radios[0]!.focus();

    fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });

    // Так себя ведёт нативная группа радио; подменять её поведение своим здесь
    // незачем — а без обработчика стрелок роль обещала бы то, чего нет.
    expect(onChange).toHaveBeenCalled();
    expect(document.activeElement).toBe(radios[1]);
  });
});
