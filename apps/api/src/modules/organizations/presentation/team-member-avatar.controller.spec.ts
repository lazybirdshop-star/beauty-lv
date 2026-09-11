import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { MediaUploadsService } from '../../media/application/media-uploads.service';
import type { MembersRepository } from '../infrastructure/members.repository';
import { TeamMemberAvatarController } from './team-member-avatar.controller';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';

const request = {
  orgMembership: { organizationId: ORG_ID, organizationMemberId: MEMBER_ID, role: 'owner' },
} as Request & { orgMembership: OrgMembership };

function setup(found = true) {
  const setAvatarInOrganization = jest
    .fn()
    .mockImplementation((_org: string, _member: string, avatar: unknown) =>
      Promise.resolve({ found, avatar }),
    );
  const isMember = jest.fn().mockResolvedValue(found);
  const createImageUpload = jest.fn().mockResolvedValue({ uploadUrl: 'u', publicUrl: 'p' });
  const controller = new TeamMemberAvatarController(
    { setAvatarInOrganization, isMember } as unknown as MembersRepository,
    { createImageUpload } as unknown as MediaUploadsService,
  );
  return { controller, setAvatarInOrganization, createImageUpload };
}

describe('TeamMemberAvatarController', () => {
  it('ставит фото участнику своей организации', async () => {
    const { controller, setAvatarInOrganization } = setup();

    await controller.setAvatar(request, MEMBER_ID, {
      url: 'https://abc.supabase.co/storage/v1/object/public/media/org/photo.jpg',
      focal: { x: 40, y: 30 },
    });

    expect(setAvatarInOrganization).toHaveBeenCalledWith(
      ORG_ID,
      MEMBER_ID,
      expect.objectContaining({ focal: { x: 40, y: 30 } }),
    );
  });

  it('участник чужой организации — 404, и права загрузить снимок нет', async () => {
    const { controller, createImageUpload } = setup(false);

    await expect(controller.clearAvatar(request, MEMBER_ID)).rejects.toThrow(NotFoundException);
    await expect(
      controller.createAvatarUpload(request, MEMBER_ID, {
        contentType: 'image/jpeg',
        byteSize: 1024,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(createImageUpload).not.toHaveBeenCalled();
  });

  it('недопустимая ссылка — отказ, а не молча пустое фото', async () => {
    const { controller, setAvatarInOrganization } = setup();

    await expect(
      controller.setAvatar(request, MEMBER_ID, {
        url: 'javascript:alert(1)',
        focal: { x: 50, y: 50 },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(setAvatarInOrganization).not.toHaveBeenCalled();
  });
});
