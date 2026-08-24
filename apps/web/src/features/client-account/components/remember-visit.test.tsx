// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { ru } from '@/lib/i18n/messages';

import { KnownGuestProvider } from '../known-guest';

import { RememberVisit } from './remember-visit';

const requestClientSignIn = vi.fn();
const claimClientVisit = vi.fn();

vi.mock('../api', () => ({
  requestClientSignIn: (input: unknown) => requestClientSignIn(input),
  claimClientVisit: (token: string) => claimClientVisit(token),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Кнопка на странице статуса записи: обмен секретной ссылки на почту.
 *
 * Две ветки, ради которых компонент и существует. Обычно адрес уже лежит в
 * самой записи, и человеку жать один раз. Но email при записи необязателен —
 * и тогда сервер отвечает единственным кодом, который эта форма различает, а
 * экран обязан спросить адрес, а не сообщить о поломке.
 */
describe('RememberVisit', () => {
  it('одним нажатием просит ссылку по адресу из самой записи', async () => {
    requestClientSignIn.mockResolvedValue(undefined);
    render(<RememberVisit token="booking-token" />);

    fireEvent.click(screen.getByRole('button', { name: ru.clientAccount.rememberMe }));

    await waitFor(() => {
      expect(screen.getByText(ru.clientAccount.linkSent)).toBeTruthy();
    });
    expect(requestClientSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ publicToken: 'booking-token' }),
    );
  });

  it('спрашивает адрес, когда в записи его нет', async () => {
    requestClientSignIn.mockRejectedValueOnce(
      new ApiError(400, 'Нужен email', { code: 'client_email_required' }),
    );
    render(<RememberVisit token="booking-token" />);

    fireEvent.click(screen.getByRole('button', { name: ru.clientAccount.rememberMe }));

    const field = await screen.findByLabelText(ru.clientAccount.rememberMeEmail);
    expect(field).toBeTruthy();

    requestClientSignIn.mockResolvedValueOnce(undefined);
    fireEvent.change(field, { target: { value: 'anna@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: ru.clientAccount.sendLink }));

    await waitFor(() => {
      expect(requestClientSignIn).toHaveBeenLastCalledWith(
        expect.objectContaining({ email: 'anna@example.com', publicToken: 'booking-token' }),
      );
    });
  });

  it('о поломке связи говорит поломкой, а не молчаливым успехом', async () => {
    requestClientSignIn.mockRejectedValue(new Error('offline'));
    render(<RememberVisit token="booking-token" />);

    fireEvent.click(screen.getByRole('button', { name: ru.clientAccount.rememberMe }));

    await waitFor(() => {
      expect(screen.getByText(ru.common.actionFailed)).toBeTruthy();
    });
  });

  /**
   * Вошедшему письмо самому себе — обряд без смысла: сессия предъявлена,
   * секретная ссылка на запись в руках. Запись обязана привязаться сразу.
   */
  it('вошедшему привязывает запись сразу, без письма', async () => {
    claimClientVisit.mockResolvedValue(undefined);
    render(
      <KnownGuestProvider guest={{ fullName: 'Anna Ozola', phone: '+371 20000114' }}>
        <RememberVisit token="booking-token" />
      </KnownGuestProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: ru.clientAccount.rememberMe }));

    await waitFor(() => {
      expect(screen.getByText(ru.clientAccount.visitSaved)).toBeTruthy();
    });
    expect(claimClientVisit).toHaveBeenCalledWith('booking-token');
    expect(requestClientSignIn).not.toHaveBeenCalled();
  });
});
