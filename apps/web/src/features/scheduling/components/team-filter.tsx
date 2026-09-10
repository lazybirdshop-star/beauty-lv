'use client';

/**
 * Кого показывать в календаре — спецификация §13.
 *
 * Два вопроса одной формы. В командном дне — «кого из команды»: несколько
 * человек сразу, «Все» по умолчанию. В дне и неделе — «чьё время»: ровно
 * один, потому что неделя из наложенных чужих дней ничего не отвечает.
 *
 * Небольшая команда — чипами, их видно целиком и нажимают одним касанием.
 * Большая — списком с поиском во всплывающем окне: двенадцать чипов в ряд
 * перестают читаться и съедают высоту, которая нужна самой сетке.
 */
import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { avatarTint, initials } from '@/lib/avatar';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { matchesSearch } from '@/lib/list-search';

/** Сколько человек помещается чипами; больше — список во всплывающем окне. */
const CHIP_LIMIT = 6;

export interface FilterMember {
  id: string;
  name: string;
}

type TeamFilterProps =
  | {
      mode: 'many';
      members: FilterMember[];
      /** `null` — все. */
      visible: ReadonlySet<string> | null;
      onToggle: (memberId: string) => void;
      onShowAll: () => void;
    }
  | {
      mode: 'one';
      members: FilterMember[];
      personId: string;
      onPick: (memberId: string) => void;
    };

function MemberMark({ member }: { member: FilterMember }) {
  return (
    <span className="avatar cal-filter__avatar" style={avatarTint(member.id)} aria-hidden="true">
      {initials(member.name)}
    </span>
  );
}

export function TeamFilter(props: TeamFilterProps) {
  const t = useT();
  const label = props.mode === 'many' ? t.schedule.teamFilter : t.schedule.personFilter;
  const allOn = props.mode === 'many' && props.visible === null;
  const isOn = (id: string) =>
    props.mode === 'many' ? Boolean(props.visible?.has(id)) : props.personId === id;
  const choose = (id: string) => (props.mode === 'many' ? props.onToggle(id) : props.onPick(id));

  if (props.members.length <= CHIP_LIMIT) {
    return (
      <div className="cal-filter" role="group" aria-label={label}>
        {props.mode === 'many' ? (
          <button
            type="button"
            className={allOn ? 'chip is-on' : 'chip'}
            aria-pressed={allOn}
            onClick={props.onShowAll}
          >
            {t.schedule.allMembers}
          </button>
        ) : null}
        {props.members.map((member) => (
          <button
            key={member.id}
            type="button"
            className={isOn(member.id) ? 'chip is-on' : 'chip'}
            aria-pressed={isOn(member.id)}
            onClick={() => choose(member.id)}
          >
            <MemberMark member={member} />
            <span className="cal-filter__name">{member.name}</span>
          </button>
        ))}
      </div>
    );
  }

  const summary =
    props.mode === 'many'
      ? props.visible === null
        ? `${t.schedule.viewTeam} · ${t.schedule.allMembers}`
        : fmt(t.schedule.teamCount, { count: props.visible.size })
      : (props.members.find((member) => member.id === props.personId)?.name ?? label);

  return (
    <div className="cal-filter">
      <TeamPicker
        label={label}
        summary={summary}
        members={props.members}
        allOn={allOn}
        onShowAll={props.mode === 'many' ? props.onShowAll : undefined}
        isOn={isOn}
        onChoose={choose}
        closeOnChoose={props.mode === 'one'}
      />
    </div>
  );
}

function TeamPicker({
  label,
  summary,
  members,
  allOn,
  onShowAll,
  isOn,
  onChoose,
  closeOnChoose,
}: {
  label: string;
  summary: string;
  members: FilterMember[];
  allOn: boolean;
  onShowAll?: () => void;
  isOn: (id: string) => boolean;
  onChoose: (id: string) => void;
  /** «Чьё время» — один ответ, и после него окно не нужно. */
  closeOnChoose: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const found = members.filter((member) => matchesSearch(query, [member.name]));

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <Popover.Trigger className="btn btn-secondary btn-sm cal-filter__trigger" aria-label={label}>
        <span className="cal-filter__name">{summary}</span>
        <Icon name="chevD" className="ico-16" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="amolie-app cal-popover" align="start" sideOffset={6}>
          <div className="cal-popover__search">
            <Icon name="search" className="ico-16 muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.schedule.findMember}
              aria-label={t.schedule.findMember}
            />
          </div>
          <div className="cal-popover__list" role="group" aria-label={label}>
            {onShowAll && !query.trim() ? (
              <button
                type="button"
                className="cal-popover__row"
                aria-pressed={allOn}
                onClick={onShowAll}
              >
                <span className={allOn ? 'cb is-on' : 'cb'} aria-hidden="true">
                  {allOn ? <Icon name="check" className="ico-16" /> : null}
                </span>
                {t.schedule.allMembers}
              </button>
            ) : null}
            {found.map((member) => (
              <button
                key={member.id}
                type="button"
                className="cal-popover__row"
                aria-pressed={isOn(member.id)}
                onClick={() => {
                  onChoose(member.id);
                  if (closeOnChoose) setOpen(false);
                }}
              >
                <span className={isOn(member.id) ? 'cb is-on' : 'cb'} aria-hidden="true">
                  {isOn(member.id) ? <Icon name="check" className="ico-16" /> : null}
                </span>
                <MemberMark member={member} />
                <span className="cal-filter__name">{member.name}</span>
              </button>
            ))}
            {found.length === 0 ? (
              <p className="t-meta cal-popover__empty">{t.schedule.noMemberFound}</p>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
