import { NotFoundException } from '@nestjs/common';

import type { OrganizationRow } from '../../../shared/database/schema/organizations';
import type { OrganizationsRepository } from '../infrastructure/organizations.repository';
import { OrganizationsService } from './organizations.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';

function setup(
  organization: (OrganizationRow & { role: string }) | null = {
    id: ORG_ID,
    role: 'owner',
  } as OrganizationRow & { role: string },
) {
  const findMineForUser = jest.fn().mockResolvedValue(organization);
  const getDashboardSummary = jest.fn().mockResolvedValue({});
  const updateProfile = jest.fn().mockResolvedValue({ id: ORG_ID });

  const service = new OrganizationsService({
    findMineForUser,
    getDashboardSummary,
    updateProfile,
  } as unknown as OrganizationsRepository);

  return { service, findMineForUser, getDashboardSummary, updateProfile };
}

describe('OrganizationsService', () => {
  it('возвращает организацию участника', async () => {
    const { service } = setup();

    await expect(service.getMine(USER_ID)).resolves.toMatchObject({ id: ORG_ID, role: 'owner' });
  });

  it('отвечает 404, если пользователь ни в одной организации', async () => {
    const { service } = setup(null);

    await expect(service.getMine(USER_ID)).rejects.toThrow(NotFoundException);
  });

  it('считает сводку по организации участника, а не по произвольной', async () => {
    const { service, getDashboardSummary } = setup();

    await service.getDashboardSummary(USER_ID);

    expect(getDashboardSummary).toHaveBeenCalledWith(ORG_ID);
  });

  it('не считает сводку без организации', async () => {
    const { service, getDashboardSummary } = setup(null);

    await expect(service.getDashboardSummary(USER_ID)).rejects.toThrow(NotFoundException);
    expect(getDashboardSummary).not.toHaveBeenCalled();
  });

  /* The organization comes from the guard-resolved membership, never from the
     request body — a member may only edit the organization they were admitted to. */
  it('редактирует профиль строго переданной организации', async () => {
    const { service, updateProfile } = setup();

    await service.updateProfile(ORG_ID, { description: 'Студия' });

    expect(updateProfile).toHaveBeenCalledWith(ORG_ID, { description: 'Студия' });
  });
});
