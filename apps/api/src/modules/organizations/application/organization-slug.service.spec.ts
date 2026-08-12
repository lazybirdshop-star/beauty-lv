import { ConflictException } from '@nestjs/common';

import type { OrganizationSlugRepository } from '../infrastructure/organization-slug.repository';
import { OrganizationSlugService } from './organization-slug.service';

const ORGANIZATION = { id: '11111111-1111-4111-8111-111111111111', slug: 'anna' };

function setup(options: { taken?: boolean; renames?: number } = {}) {
  const isTaken = jest.fn().mockResolvedValue(options.taken ?? false);
  const countRenamesSince = jest.fn().mockResolvedValue(options.renames ?? 0);
  const rename = jest
    .fn()
    .mockImplementation((_id: string, _from: string, to: string) => Promise.resolve({ slug: to }));
  const listRetired = jest.fn().mockResolvedValue([]);

  const service = new OrganizationSlugService({
    isTaken,
    countRenamesSince,
    rename,
    listRetired,
  } as unknown as OrganizationSlugRepository);

  return { service, isTaken, countRenamesSince, rename };
}

describe('OrganizationSlugService', () => {
  describe('проверка адреса', () => {
    it('нормализует то, что мастер вставил из адресной строки', async () => {
      const { service } = setup();

      await expect(
        service.checkAvailability(ORGANIZATION, 'https://amolie.com/Anna Nails/'),
      ).resolves.toMatchObject({ slug: 'anna-nails', available: true, reason: null });
    });

    it('называет причину отказа вместо исключения', async () => {
      const { service } = setup();

      await expect(service.checkAvailability(ORGANIZATION, 'ab')).resolves.toMatchObject({
        available: false,
        reason: 'too-short',
      });
      await expect(service.checkAvailability(ORGANIZATION, 'admin')).resolves.toMatchObject({
        available: false,
        reason: 'reserved',
      });
    });

    it('текущий адрес — не конфликт и не предложение', async () => {
      const { service, isTaken } = setup();

      await expect(service.checkAvailability(ORGANIZATION, 'anna')).resolves.toMatchObject({
        current: true,
        available: false,
        reason: null,
      });
      // Свой же адрес не должен стоить запроса в базу.
      expect(isTaken).not.toHaveBeenCalled();
    });

    it('занятый адрес отдаёт причину «taken»', async () => {
      const { service } = setup({ taken: true });

      await expect(service.checkAvailability(ORGANIZATION, 'maria')).resolves.toMatchObject({
        available: false,
        reason: 'taken',
      });
    });
  });

  describe('смена адреса', () => {
    it('сохраняет нормализованное значение', async () => {
      const { service, rename } = setup();

      await expect(service.change(ORGANIZATION, '  Anna Nails ')).resolves.toMatchObject({
        slug: 'anna-nails',
      });
      expect(rename).toHaveBeenCalledWith(ORGANIZATION.id, 'anna', 'anna-nails');
    });

    /* Проверка «свободно ли» отвечала на нажатие клавиши, а это — решение:
       правила проверяются заново, а не берутся на веру у клиента. */
    it.each([
      ['ab', 'too-short'],
      ['admin', 'reserved'],
      ['-anna', 'format'],
    ])('отказывает в адресе «%s» с причиной «%s»', async (value, reason) => {
      const { service, rename } = setup();

      await expect(service.change(ORGANIZATION, value)).rejects.toMatchObject({
        response: { reason },
      });
      expect(rename).not.toHaveBeenCalled();
    });

    it('не переименовывает в занятый адрес', async () => {
      const { service, rename } = setup({ taken: true });

      await expect(service.change(ORGANIZATION, 'maria')).rejects.toThrow(ConflictException);
      expect(rename).not.toHaveBeenCalled();
    });

    it('держит лимит переименований за окно', async () => {
      const { service, rename } = setup({ renames: 3 });

      await expect(service.change(ORGANIZATION, 'anna-nails')).rejects.toMatchObject({
        response: { reason: 'too-many-changes' },
      });
      expect(rename).not.toHaveBeenCalled();
    });
  });
});
