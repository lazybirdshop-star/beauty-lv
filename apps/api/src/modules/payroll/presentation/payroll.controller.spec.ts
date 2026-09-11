import { ForbiddenException } from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { PayrollService } from '../application/payroll.service';
import { PayrollController } from './payroll.controller';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SELF = '22222222-2222-4222-8222-222222222222';

function requestFor(role: OrgMembership['role']) {
  return {
    orgMembership: { organizationId: ORG_ID, organizationMemberId: SELF, role },
  } as Request & { orgMembership: OrgMembership };
}

function setup() {
  const listPayouts = jest.fn().mockResolvedValue([]);
  const listCompensation = jest.fn().mockResolvedValue([]);
  const controller = new PayrollController({
    listPayouts,
    listCompensation,
  } as unknown as PayrollService);
  return { controller, listPayouts, listCompensation };
}

describe('PayrollController — кто что видит', () => {
  it('владелица видит ведомости всех, включая черновики', async () => {
    const { controller, listPayouts } = setup();

    await controller.listPayouts(requestFor('owner'), {});

    expect(listPayouts).toHaveBeenCalledWith(ORG_ID, {
      includeDrafts: true,
      from: undefined,
      to: undefined,
    });
  });

  it('наёмный мастер — только свои и без черновиков', async () => {
    const { controller, listPayouts, listCompensation } = setup();

    await controller.listPayouts(requestFor('master'), { from: '2026-09-01' });
    await controller.listCompensation(requestFor('master'));

    expect(listPayouts).toHaveBeenCalledWith(ORG_ID, {
      onlyMemberId: SELF,
      includeDrafts: false,
      from: '2026-09-01',
      to: undefined,
    });
    expect(listCompensation).toHaveBeenCalledWith(ORG_ID, SELF);
  });

  it('администратор салона выплат людей не видит', () => {
    const { controller, listPayouts } = setup();

    expect(() => controller.listPayouts(requestFor('admin'), {})).toThrow(ForbiddenException);
    let refusal: unknown;
    try {
      void controller.listCompensation(requestFor('admin'));
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(ForbiddenException);
    expect((refusal as ForbiddenException).getResponse()).toMatchObject({
      code: DASHBOARD_ERROR_CODES.payrollForbidden,
    });
    expect(listPayouts).not.toHaveBeenCalled();
  });
});
