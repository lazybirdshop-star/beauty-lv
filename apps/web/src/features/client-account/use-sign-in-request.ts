'use client';

import { AUTH_ERROR_CODES } from '@amolie/shared-kernel';
import { useState } from 'react';

import { errorField } from '@/lib/api-error';
import { useLocale } from '@/lib/i18n';

import { requestClientSignIn } from './api';

/**
 * `needEmail` — не ошибка, а вопрос.
 *
 * Со страницы своей записи человек нажимает «сохранить за собой», не вводя
 * ничего: адрес обычно уже лежит в самой записи. Но при записи он
 * необязателен, и тогда сервер отвечает единственным кодом, который эта форма
 * различает, — экран показывает поле и спрашивает, а не сообщает о поломке.
 */
export type SignInRequestState = 'idle' | 'sending' | 'needEmail' | 'sent' | 'error';

export function useSignInRequest(publicToken?: string) {
  const locale = useLocale();
  const [state, setState] = useState<SignInRequestState>('idle');
  /**
   * Вопрос про адрес однажды задан — и задан навсегда.
   *
   * Без этой защёлки сбой отправки возвращал экран к одинокой кнопке
   * «сохранить за собой»: форма сворачивалась, введённый адрес исчезал, и
   * человек, у которого письмо не ушло из-за связи, должен был набирать почту
   * заново, не понимая, куда делось поле. Состояние отправки и состояние «нам
   * нужен адрес» — разные вопросы, и второй не отменяется первым.
   */
  const [emailAsked, setEmailAsked] = useState(false);

  async function submit(email?: string): Promise<void> {
    setState('sending');
    try {
      await requestClientSignIn({ email, publicToken, locale });
      setState('sent');
    } catch (error) {
      if (errorField(error, 'code') === AUTH_ERROR_CODES.clientEmailRequired) {
        setEmailAsked(true);
        setState('needEmail');
        return;
      }
      setState('error');
    }
  }

  return { state, emailAsked, submit };
}
