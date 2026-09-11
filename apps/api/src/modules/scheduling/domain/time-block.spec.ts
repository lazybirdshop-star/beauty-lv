import {
  addCivilDays,
  blockAt,
  overlappingBlock,
  weeklyOccurrences,
  type BlockInterval,
} from './time-block';

const RIGA = 'Europe/Riga';
const ANNA = 'anna';

function block(from: string, to: string, member = ANNA): BlockInterval {
  return {
    id: `${member}-${from}`,
    organizationMemberId: member,
    startsAt: new Date(from),
    endsAt: new Date(to),
  };
}

describe('blockAt', () => {
  const lunch = [block('2036-05-01T10:00:00.000Z', '2036-05-01T11:00:00.000Z')];

  it('начало блока — внутри, конец — уже нет', () => {
    expect(blockAt(lunch, ANNA, new Date('2036-05-01T10:00:00.000Z'))).not.toBeNull();
    expect(blockAt(lunch, ANNA, new Date('2036-05-01T11:00:00.000Z'))).toBeNull();
  });

  it('блок коллеги чужое время не занимает', () => {
    expect(blockAt(lunch, 'julia', new Date('2036-05-01T10:30:00.000Z'))).toBeNull();
  });
});

describe('overlappingBlock', () => {
  const lunch = [block('2036-05-01T10:00:00.000Z', '2036-05-01T11:00:00.000Z')];

  it('визит, дотягивающийся до обеда, на него наезжает', () => {
    expect(
      overlappingBlock(
        lunch,
        ANNA,
        new Date('2036-05-01T09:30:00.000Z'),
        new Date('2036-05-01T10:15:00.000Z'),
      ),
    ).not.toBeNull();
  });

  it('визит, кончающийся ровно к обеду, — нет', () => {
    expect(
      overlappingBlock(
        lunch,
        ANNA,
        new Date('2036-05-01T09:00:00.000Z'),
        new Date('2036-05-01T10:00:00.000Z'),
      ),
    ).toBeNull();
  });
});

describe('weeklyOccurrences и addCivilDays', () => {
  it('обед в 13:00 остаётся в 13:00 и через перевод часов', () => {
    /* 22 октября 2026 в Риге ещё +03:00, 29-го уже +02:00. */
    const [first, second] = weeklyOccurrences(
      {
        startsAt: new Date('2026-10-22T10:00:00.000Z'),
        endsAt: new Date('2026-10-22T11:00:00.000Z'),
      },
      2,
      RIGA,
    );
    expect(first!.startsAt.toISOString()).toBe('2026-10-22T10:00:00.000Z');
    expect(second!.startsAt.toISOString()).toBe('2026-10-29T11:00:00.000Z');
    expect(second!.endsAt.toISOString()).toBe('2026-10-29T12:00:00.000Z');
  });

  it('без повтора — сам блок', () => {
    expect(
      weeklyOccurrences(
        {
          startsAt: new Date('2036-05-01T10:00:00.000Z'),
          endsAt: new Date('2036-05-01T11:00:00.000Z'),
        },
        1,
        RIGA,
      ),
    ).toHaveLength(1);
  });

  it('ноль дней — тот же момент', () => {
    const moment = new Date('2036-05-01T10:00:00.000Z');
    expect(addCivilDays(moment, 0, RIGA).toISOString()).toBe(moment.toISOString());
  });
});
