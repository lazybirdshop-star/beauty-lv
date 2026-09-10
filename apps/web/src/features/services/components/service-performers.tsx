'use client';

import { useT } from '@/lib/i18n';

import type { ServicePerformerInput } from '../types';

interface Member {
  id: string;
  name: string;
}

/**
 * «Кто выполняет услугу» — блок внутри формы услуги (SALON.md §4.5).
 *
 * Показывается только у команды: у мастера-одиночки вопрос «кто из вас это
 * делает» бессмысленный, а галочка напротив собственного имени — работа,
 * которую продукт придумал сам себе.
 *
 * Цена и длительность спрашиваются **под** отмеченным мастером и пустыми
 * означают «как в прайсе». Это не то же, что ноль: ноль — «бесплатно», и
 * подменять им умолчание значит однажды продать работу даром. В подсказке
 * поля стоит значение из прайса, поэтому пустое поле читается, а не гадается.
 */
export function ServicePerformers({
  members,
  value,
  onChange,
  catalogPrice,
  catalogDuration,
}: {
  members: Member[];
  value: ServicePerformerInput[];
  onChange: (next: ServicePerformerInput[]) => void;
  /** Цена из прайса — в тех же единицах, что показывает форма (не центы). */
  catalogPrice: number;
  catalogDuration: number;
}) {
  const t = useT();
  const chosen = new Map(value.map((item) => [item.organizationMemberId, item]));

  function toggle(id: string) {
    if (chosen.has(id)) {
      onChange(value.filter((item) => item.organizationMemberId !== id));
      return;
    }
    onChange([
      ...value,
      { organizationMemberId: id, priceOverrideAmount: null, durationOverrideMinutes: null },
    ]);
  }

  function patch(
    id: string,
    field: 'priceOverrideAmount' | 'durationOverrideMinutes',
    raw: string,
  ) {
    const parsed = raw.trim() === '' ? null : Number(raw.replace(',', '.'));
    onChange(
      value.map((item) =>
        item.organizationMemberId === id
          ? { ...item, [field]: Number.isFinite(parsed as number) ? parsed : null }
          : item,
      ),
    );
  }

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-semibold text-ink-soft">{t.services.performers}</legend>
      <p className="text-sm text-ink-faint">{t.services.performersHint}</p>

      {members.map((member) => {
        const picked = chosen.get(member.id);
        return (
          <div key={member.id} className="flex flex-col gap-2">
            <label className="flex items-center gap-3 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={Boolean(picked)}
                onChange={() => toggle(member.id)}
                className="size-5 accent-[var(--accent)]"
              />
              <span>{member.name}</span>
            </label>

            {picked ? (
              <div className="ml-8 flex gap-2">
                <input
                  aria-label={`${member.name} — ${t.services.priceLabel}`}
                  className="h-11 w-full rounded-[var(--field-radius)] border border-border-strong bg-bg-raised px-3 text-[15px] text-ink"
                  inputMode="decimal"
                  placeholder={String(catalogPrice)}
                  value={
                    picked.priceOverrideAmount === null ? '' : String(picked.priceOverrideAmount)
                  }
                  onChange={(event) => patch(member.id, 'priceOverrideAmount', event.target.value)}
                />
                <input
                  aria-label={`${member.name} — ${t.services.durationLabel}`}
                  className="h-11 w-full rounded-[var(--field-radius)] border border-border-strong bg-bg-raised px-3 text-[15px] text-ink"
                  inputMode="numeric"
                  placeholder={String(catalogDuration)}
                  value={
                    picked.durationOverrideMinutes === null
                      ? ''
                      : String(picked.durationOverrideMinutes)
                  }
                  onChange={(event) =>
                    patch(member.id, 'durationOverrideMinutes', event.target.value)
                  }
                />
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Услуга без единого исполнителя не мертва в базе, но мертва для
          клиента: записаться на неё нельзя ни к кому. Сказать это надо там,
          где решение принимается, а не отказом при сохранении. */}
      {value.length === 0 ? (
        <p className="text-sm text-danger">{t.services.performersEmpty}</p>
      ) : null}
    </fieldset>
  );
}
