/**
 * Why a sign-in or a registration failed, as a value both sides agree on.
 *
 * The screens that show these run before anyone is signed in, so they have no
 * stored language and must localise the reason themselves (`lib/i18n` on the
 * web side). Relaying the server's own sentence would hand a Latvian master a
 * Russian error; matching on HTTP status alone cannot tell "wrong password"
 * from "account closed", which are different things to say to a person.
 */
export const AUTH_ERROR_CODES = {
  invalidCredentials: 'invalid_credentials',
  accountBlocked: 'account_blocked',
  inviteInvalid: 'invite_invalid',
  emailTaken: 'email_taken',
  phoneTaken: 'phone_taken',
  /** Ссылка из письма: неизвестна, протухла или уже сработала. */
  resetTokenInvalid: 'reset_token_invalid',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === 'string' && (Object.values(AUTH_ERROR_CODES) as string[]).includes(value);
}
