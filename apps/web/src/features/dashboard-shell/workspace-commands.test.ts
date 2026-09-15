import { describe, expect, it } from 'vitest';

import { ru } from '@/lib/i18n/messages';
import { foldForSearch } from '@/lib/list-search';

import { workspaceCapabilities } from './capabilities';
import { createCommands, matchCommands, workspaceCommands } from './workspace-commands';

const solo = { organizationType: 'solo', teamSize: 1 } as const;
const salon = { organizationType: 'salon', teamSize: 3 } as const;

describe('workspace commands', () => {
  it('владелица салона видит все действия в порядке прототипа', () => {
    const commands = createCommands('anna', ru, workspaceCapabilities('owner', salon));

    expect(commands.map((command) => command.id)).toEqual([
      'new-booking',
      'open-time',
      'block-time',
      'new-client',
      'add-service',
      'add-member',
    ]);
  });

  it('у каждого действия есть пояснение — шторка и палитра показывают его строкой', () => {
    const commands = createCommands('anna', ru, workspaceCapabilities('owner', salon));

    expect(commands.every((command) => Boolean(command.hint))).toBe(true);
  });

  it('соло-мастер не зовёт в команду — команды у неё нет', () => {
    const ids = createCommands('anna', ru, workspaceCapabilities('owner', solo)).map(
      (command) => command.id,
    );

    expect(ids).not.toContain('add-member');
    expect(ids).toContain('add-service');
  });

  it('наёмный мастер не зовёт в команду, но блокирует своё время', () => {
    const ids = createCommands('anna', ru, workspaceCapabilities('master', salon)).map(
      (command) => command.id,
    );

    expect(ids).not.toContain('add-member');
    expect(ids).toContain('block-time');
  });

  it('разделы — из карты меню и без внешней ссылки на почту', () => {
    const go = workspaceCommands('anna', ru, workspaceCapabilities('owner', solo)).filter(
      (command) => command.group === 'go',
    );

    expect(go[0]).toMatchObject({
      id: 'go-home',
      target: { kind: 'href', href: '/anna/dashboard' },
    });
    expect(go.map((command) => command.id)).not.toContain('go-help');
    // У соло-мастера раздела «Команда» нет — и в палитре так же.
    expect(go.map((command) => command.id)).not.toContain('go-team');
  });

  it('ищет по подписи без учёта регистра', () => {
    const commands = workspaceCommands('anna', ru, workspaceCapabilities('owner', solo));

    expect(matchCommands(commands, foldForSearch('БЛОК')).map((command) => command.id)).toEqual([
      'block-time',
    ]);
  });

  it('ищет и по пояснению: «обед» находит блокировку времени', () => {
    const commands = workspaceCommands('anna', ru, workspaceCapabilities('owner', solo));

    expect(matchCommands(commands, foldForSearch('обед')).map((command) => command.id)).toEqual([
      'block-time',
    ]);
  });
});
