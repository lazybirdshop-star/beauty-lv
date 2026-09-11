import Link from 'next/link';

import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import type { TeamMember } from '@/features/team/types';
import { plural, type Messages } from '@/lib/i18n/messages';

/**
 * Пульс команды на «Сегодня» — у кого сколько записей (спецификация §9).
 *
 * Строками, а не карточками на человека и не графиком: вопрос администратора
 * утром — «кто сегодня загружен, а кто свободен», и ответ на него помещается в
 * столбик имён с числом. Строка ведёт в командный день, где видно всё остальное.
 */
export function TeamPulse({
  members,
  href,
  locale,
  t,
}: {
  members: TeamMember[];
  href: string;
  locale: string;
  t: Messages;
}) {
  const working = members.filter((member) => member.status === 'active');
  if (working.length < 2) return null;

  return (
    <section className="today-pulse" aria-labelledby="team-pulse-title">
      <div className="today-section-head">
        <h2 id="team-pulse-title" className="t-section">
          {t.workspace.teamToday}
        </h2>
        <Link href={href}>{t.schedule.viewTeam}</Link>
      </div>
      <ul>
        {working.map((member) => (
          <li key={member.id}>
            <Link className="today-pulse__row" href={href}>
              <MemberAvatar
                className="today-pulse__avatar"
                name={member.name}
                seed={member.id}
                url={member.avatarUrl}
                focal={member.avatarFocal}
              />
              <span className="today-pulse__name">{member.name}</span>
              <span className="tnum t-meta">
                {member.bookingsToday} {plural(locale, member.bookingsToday, t.common.bookingForms)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
