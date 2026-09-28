import { fireEvent, screen, within } from '@testing-library/react';

import { ru } from '@/lib/i18n/messages';

/**
 * Выбрать дату так, как её выберет мастер.
 *
 * Поле даты кабинета — не нативный `input[type=date]`, и подменить его
 * значение событием `change` нельзя: у кнопки нет сеттера значения. Путь
 * человека короткий и сам по себе достоин проверки — открыть сетку, при
 * нужде переставить месяц и год списками, нажать клетку числа.
 *
 * `label` — подпись поля: в одной форме их бывает две («С какого», «По
 * какое»), и выбирать надо именно ту.
 */
export function pickDate(key: string, label: string = ru.schedule.date): void {
  const field = screen.getByLabelText(label);
  fireEvent.click(field);
  const panel = field.closest('details');
  if (panel) panel.open = true;

  const scope = within(panel ?? document.body);
  fireEvent.change(scope.getByLabelText(ru.schedule.year), { target: { value: key.slice(0, 4) } });
  fireEvent.change(scope.getByLabelText(ru.schedule.month), { target: { value: key.slice(5, 7) } });

  const cell = scope
    .getAllByRole('button', { name: String(Number(key.slice(8, 10))) })
    .find((node) => node.dataset.key === key);
  if (!cell) throw new Error(`в сетке нет клетки ${key}`);
  fireEvent.click(cell);
}

/**
 * Выбрать час так же, как его выберет мастер: открыть список и нажать
 * строку. Нативных часов у форм кабинета больше нет.
 */
export function pickTime(time: string, label: string = ru.schedule.time): void {
  const field = screen.getByLabelText(label);
  fireEvent.click(field);
  const panel = field.closest('details');
  if (panel) panel.open = true;

  const scope = within(panel ?? document.body);
  fireEvent.click(scope.getByRole('option', { name: time }));
}
