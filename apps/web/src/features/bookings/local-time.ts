/**
 * Момент времени и поля «дата» и «время» — в часовом поясе заведения.
 *
 * Отдельным модулем, потому что это единственная арифметика переноса, и она
 * ошибается тихо: перепутанный пояс сдвигает визит на час, и заметит это
 * клиент, пришедший не вовремя.
 */
/**
 * Разбить момент на поля даты и времени — в часовом поясе заведения.
 *
 * `toISOString` здесь не годится: он даёт UTC, и визит в 10:30 по Риге
 * оказался бы в полях как 07:30. Поля показывают то же время, что и вся
 * остальная панель.
 */
export function splitLocal(
  iso: string,
  timeZone: string | undefined,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));

  const [date, time] = parts.split(' ');
  return { date: date ?? '', time: (time ?? '').slice(0, 5) };
}

/**
 * Собрать момент обратно из полей.
 *
 * Смещение берётся у самой даты, а не считается: у Риги зимой +02:00, летом
 * +03:00, и постоянная поправка ошиблась бы на час дважды в год.
 */
export function joinLocal(date: string, time: string, timeZone: string | undefined): string | null {
  if (!date || !time) return null;

  const naive = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const shown = new Date(
    new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
    })
      .format(naive)
      .replace(' ', 'T') + 'Z',
  );

  return new Date(naive.getTime() * 2 - shown.getTime()).toISOString();
}
