import { NotFoundException } from '@nestjs/common';

import type { BookingsRepository } from '../../booking/infrastructure/bookings.repository';
import type { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import type { ServiceAddonsRepository } from '../../services-catalog/infrastructure/service-addons.repository';
import type { ServiceCategoriesRepository } from '../../services-catalog/infrastructure/service-categories.repository';
import type { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import type { OrganizationSlugRepository } from '../infrastructure/organization-slug.repository';
import type {
  OrganizationsRepository,
  PublicOrganizationProfile,
} from '../infrastructure/organizations.repository';
import { PublicProfileService } from './public-profile.service';

const ORG_ID = '11111111-1111-4111-8111-111111111111';

/**
 * Mocks are held as named handles rather than read back off the repository
 * objects: asserting on `repo.method` would detach the function from its
 * receiver, which is both a lint error and a habit that hides real `this`
 * bugs in non-test code.
 */
function setup(
  organization: PublicOrganizationProfile | null = { id: ORG_ID } as PublicOrganizationProfile,
) {
  const findPublicBySlug = jest.fn().mockResolvedValue(organization);
  const listActiveServices = jest.fn().mockResolvedValue([]);
  const listActiveCategories = jest.fn().mockResolvedValue([]);
  const listPairs = jest.fn().mockResolvedValue([]);
  const listAvailable = jest.fn().mockResolvedValue([]);
  const listFitting = jest.fn().mockResolvedValue([]);
  const findPublicByToken = jest.fn().mockResolvedValue({ status: 'pending' });
  /* No retired address by default: the miss under test is a real 404, not a
     master who moved. The redirect case sets its own value. */
  const findCurrentSlugForRetired = jest.fn().mockResolvedValue(null);

  const service = new PublicProfileService(
    { findPublicBySlug } as unknown as OrganizationsRepository,
    { findCurrentSlugForRetired } as unknown as OrganizationSlugRepository,
    { listActiveForOrganization: listActiveServices } as unknown as ServicesRepository,
    { listActiveForOrganization: listActiveCategories } as unknown as ServiceCategoriesRepository,
    { listPairs } as unknown as ServiceAddonsRepository,
    {
      listAvailableForOrganization: listAvailable,
      listAvailableFittingDuration: listFitting,
    } as unknown as PublishedSlotsRepository,
    { findPublicByToken } as unknown as BookingsRepository,
  );

  return {
    service,
    findCurrentSlugForRetired,
    findPublicBySlug,
    listActiveServices,
    listPairs,
    listAvailable,
    listFitting,
    findPublicByToken,
  };
}

describe('PublicProfileService', () => {
  describe('разрешение слага', () => {
    /* The point of centralising the lookup: no public route may reach a
       second query with an unresolved — or unpublished — master. */
    it.each([
      ['getProfile', (s: PublicProfileService) => s.getProfile('ghost')],
      ['listServices', (s: PublicProfileService) => s.listServices('ghost')],
      ['listServiceCategories', (s: PublicProfileService) => s.listServiceCategories('ghost')],
      ['listServiceAddons', (s: PublicProfileService) => s.listServiceAddons('ghost')],
      ['listAvailability', (s: PublicProfileService) => s.listAvailability('ghost')],
      ['getBookingByToken', (s: PublicProfileService) => s.getBookingByToken('ghost', 'token')],
    ])('%s отвечает 404 на неизвестного мастера', async (_name, call) => {
      const { service } = setup(null);

      await expect(call(service)).rejects.toThrow(NotFoundException);
    });

    it('не трогает каталог, если мастер не найден', async () => {
      const { service, listActiveServices } = setup(null);

      await expect(service.listServices('ghost')).rejects.toThrow(NotFoundException);
      expect(listActiveServices).not.toHaveBeenCalled();
    });

    /* Смена адреса не должна убивать ссылки, которые мастер уже раздал:
       старый адрес отвечает не «нет такого мастера», а «она теперь здесь». */
    it('на прежний адрес отвечает 404 с новым адресом', async () => {
      const { service, findCurrentSlugForRetired } = setup(null);
      findCurrentSlugForRetired.mockResolvedValue('anna-nails');

      await expect(service.getProfile('anna')).rejects.toMatchObject({
        response: { movedTo: 'anna-nails' },
      });
    });
  });

  describe('витрина', () => {
    it('отдаёт только активные надстройки', async () => {
      const { service, listPairs } = setup();

      await service.listServiceAddons('anna');

      expect(listPairs).toHaveBeenCalledWith(ORG_ID, true);
    });
  });

  describe('доступность', () => {
    it('без длительности отдаёт все открытые окна', async () => {
      const { service, listAvailable, listFitting } = setup();

      await service.listAvailability('anna');

      expect(listAvailable).toHaveBeenCalledWith(ORG_ID);
      expect(listFitting).not.toHaveBeenCalled();
    });

    it('с длительностью отдаёт только подходящие окна', async () => {
      const { service, listFitting } = setup();

      await service.listAvailability('anna', '90');

      expect(listFitting).toHaveBeenCalledWith(ORG_ID, 90);
    });

    /* A bad duration degrades to the full list rather than failing the page:
       the parameter only narrows the same result. */
    it.each(['0', '-30', 'abc', ''])(
      'считает некорректную длительность %p отсутствующей',
      async (duration) => {
        const { service, listAvailable, listFitting } = setup();

        await service.listAvailability('anna', duration);

        expect(listAvailable).toHaveBeenCalledWith(ORG_ID);
        expect(listFitting).not.toHaveBeenCalled();
      },
    );
  });

  describe('чтение записи по токену', () => {
    it('возвращает запись владельцу токена', async () => {
      const { service, findPublicByToken } = setup();

      await expect(service.getBookingByToken('anna', 'token')).resolves.toEqual({
        status: 'pending',
      });
      expect(findPublicByToken).toHaveBeenCalledWith(ORG_ID, 'token');
    });

    /* Both misses answer identically, so the response can never hint that a
       booking exists but belongs to someone else. */
    it('на чужой токен отвечает тем же 404, что и на неизвестного мастера', async () => {
      const unknownMaster = setup(null);
      const wrongToken = setup();
      wrongToken.findPublicByToken.mockResolvedValue(null);

      const first = await unknownMaster.service
        .getBookingByToken('ghost', 'token')
        .catch((error: unknown) => error);
      const second = await wrongToken.service
        .getBookingByToken('anna', 'nope')
        .catch((error: unknown) => error);

      expect(first).toBeInstanceOf(NotFoundException);
      expect(second).toBeInstanceOf(NotFoundException);
      expect((first as NotFoundException).message).toBe((second as NotFoundException).message);
    });
  });
});
