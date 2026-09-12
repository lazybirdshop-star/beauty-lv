'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
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
    <section className="home-prompt" aria-labelledby="team-prompt-title">
      <h2 id="team-prompt-title" className="type-strong">
        {t.workspace.teamPromptTitle}
      </h2>
      <p className="type-meta">{t.workspace.teamPromptText}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/${slug}/dashboard/team?invite=1`}>{t.workspace.addMember}</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => dismiss(true)}>
          {t.workspace.dismiss}
        </Button>
      </div>
    </section>
  );
}
