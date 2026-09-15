'use client';

import { Input } from '@/components/ui/input';
import { SheetSection } from '@/components/ui/sheet-parts';
import { SwitchRow } from '@/components/ui/switch-row';
import { useT } from '@/lib/i18n';

import type { ServicePerformerInput } from '../types';

interface Member {
  id: string;
  name: string;
  /** Кем человек работает — строкой под именем, как в прототипе. */
  hint?: string;
}

/**
 * «Кто выполняет услугу» — раздел формы услуги (SALON.md §4.5, прототип
 * «Кабинет 2026»): строка тумблера на человека.
 *
 * Показывается только у команды: у мастера-одиночки вопрос «кто из вас это
 * делает» бессмысленный, а тумблер напротив собственного имени — работа,
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
    <SheetSection title={t.services.performers}>
      <p className="form-field__hint">{t.services.performersHint}</p>

      <div className="switch-list">
        {members.map((member) => {
          const picked = chosen.get(member.id);
          return (
            <SwitchRow
              key={member.id}
              label={member.name}
              hint={member.hint}
              checked={Boolean(picked)}
              onChange={() => toggle(member.id)}
            >
              {picked ? (
                <span className="form-grid">
                  <Input
                    aria-label={`${member.name} — ${t.services.priceLabel}`}
                    inputMode="decimal"
                    placeholder={String(catalogPrice)}
                    value={
                      picked.priceOverrideAmount === null ? '' : String(picked.priceOverrideAmount)
                    }
                    onChange={(event) =>
                      patch(member.id, 'priceOverrideAmount', event.target.value)
                    }
                  />
                  <Input
                    aria-label={`${member.name} — ${t.services.durationLabel}`}
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
                </span>
              ) : null}
            </SwitchRow>
          );
        })}
      </div>

      {/* Услуга без единого исполнителя не мертва в базе, но мертва для
          клиента: записаться на неё нельзя ни к кому. Сказать это надо там,
          где решение принимается, а не отказом при сохранении. */}
      {value.length === 0 ? (
        <p className="form-field__hint form-field__hint--danger">{t.services.performersEmpty}</p>
      ) : null}
    </SheetSection>
  );
}
