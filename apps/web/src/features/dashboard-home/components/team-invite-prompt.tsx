'use client';

import Link from 'next/link';

import { useT } from '@/lib/i18n';
import { useLocalFlag } from '@/lib/use-local-flag';

/**
 * «Работаете с командой?» — тихий вход в команду для того, кто пока один
 * (спецификация §33).
 *
 * Раздела «Команда» в меню соло-мастера нет: он ей не нужен, и пункт, за
 * которым пустой список, делает из кабинета салонную ERP. Но дорога к команде
 * должна быть — вот она. Скрывается навсегда одним нажатием: подсказка,
 * которую нельзя убрать, становится мебелью.
 */
export function TeamInvitePrompt({ slug }: { slug: string }) {
  const t = useT();
  const [dismissed, dismiss] = useLocalFlag(`amolie:team-prompt-dismissed:${slug}`);
  if (dismissed !== false) return null;

  return (
    <section className="today-prompt" aria-labelledby="team-prompt-title">
      <h2 id="team-prompt-title" className="t-strong">
        {t.workspace.teamPromptTitle}
      </h2>
      <p className="t-meta">{t.workspace.teamPromptText}</p>
      <div className="row" style={{ gap: 8 }}>
        <Link className="btn btn-secondary btn-sm" href={`/${slug}/dashboard/team?invite=1`}>
          {t.workspace.addMember}
        </Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismiss(true)}>
          {t.workspace.dismiss}
        </button>
      </div>
    </section>
  );
}
