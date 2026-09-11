import { NotFoundException } from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { StaffServicesRepository } from '../infrastructure/staff-services.repository';
import { MemberServicesController } from './member-services.controller';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const SERVICE_ID = '33333333-3333-4333-8333-333333333333';

const request = {
  orgMembership: { organizationId: ORG_ID, organizationMemberId: MEMBER_ID, role: 'owner' },
} as Request & { orgMembership: OrgMembership };

function setup(isMember = true) {
  const listForMember = jest.fn().mockResolvedValue([]);
  const replaceForMember = jest.fn().mockResolvedValue(undefined);
  const controller = new MemberServicesController({
    isMember: jest.fn().mockResolvedValue(isMember),
    listForMember,
    replaceForMember,
  } as unknown as StaffServicesRepository);
  return { controller, listForMember, replaceForMember };
}

describe('MemberServicesController', () => {
  it('участник чужой организации — 404 с кодом, и ничего не пишется', async () => {
    const { controller, replaceForMember } = setup(false);

    const attempt = controller.replace(request, MEMBER_ID, { services: [] });

    await expect(attempt).rejects.toThrow(NotFoundException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: DASHBOARD_ERROR_CODES.memberNotFound },
    });
    expect(replaceForMember).not.toHaveBeenCalled();
  });

  it('две одинаковые галочки — одна услуга, последние условия побеждают', async () => {
    const { controller, replaceForMember } = setup();

    await controller.replace(request, MEMBER_ID, {
      services: [
        { serviceId: SERVICE_ID, priceOverrideAmount: 1000 },
        { serviceId: SERVICE_ID, priceOverrideAmount: 2000 },
      ],
    });

    expect(replaceForMember).toHaveBeenCalledWith(ORG_ID, MEMBER_ID, [
      { serviceId: SERVICE_ID, priceOverrideAmount: 2000 },
    ]);
  });

  it('отвечает свежим списком после замены', async () => {
    const { controller, listForMember } = setup();

    await controller.replace(request, MEMBER_ID, { services: [] });

    expect(listForMember).toHaveBeenCalledWith(ORG_ID, MEMBER_ID);
  });
});
