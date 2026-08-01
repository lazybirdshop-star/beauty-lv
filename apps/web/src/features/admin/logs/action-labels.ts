const ACTION_LABELS: Record<string, string> = {
  'master.blocked': 'заблокировал мастера',
  'master.unblocked': 'разблокировал мастера',
  'user.blocked': 'заблокировал пользователя',
  'user.unblocked': 'разблокировал пользователя',
  'user.role_changed': 'изменил роль пользователя',
};

/** Falls back to the raw action string for anything not in the map yet — never hides an entry. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
