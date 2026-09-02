import { BadRequestException } from '@nestjs/common';
import type { MediaDecision } from '@amolie/shared-kernel';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';

import type { MembersRepository } from '../infrastructure/members.repository';

import { MembersController } from './members.controller';

/**
 * Портрет участника — маршрут без права сверх членства, и потому его правила
 * проверяются здесь, а не подразумеваются.
 *
 * Два вопроса, на которые он обязан отвечать одинаково всегда: над чьей
 * строкой он работает (только над своей — той, что резолвил guard) и что
 * считается допустимой ссылкой.
 */
describe('MembersController', () => {
  const organizationMemberId = '22222222-2222-4222-8222-222222222222';
  const request = {
    orgMembership: {
      organizationId: '11111111-1111-4111-8111-111111111111',
      organizationMemberId,
      role: 'master' as const,
    },
  } as Request & { orgMembership: OrgMembership };

  function build() {
    const setAvatar = jest.fn(
      async (_id: string, avatar: MediaDecision | null) => await Promise.resolve(avatar),
    );
    const findAvatar = jest.fn(async () => await Promise.resolve(null));
    const createImageUpload = jest.fn(
      async () => await Promise.resolve({ uploadUrl: '', publicUrl: '' }),
    );

    const controller = new MembersController(
      { setAvatar, findAvatar } as unknown as MembersRepository,
      { createImageUpload } as never,
    );
    return { controller, setAvatar, findAvatar, createImageUpload };
  }

  it('пишет только в строку, которую резолвил guard', async () => {
    const { controller, setAvatar } = build();
    await controller.setAvatar(request, {
      url: 'https://cdn.example.com/face.jpg',
    });

    expect(setAvatar).toHaveBeenCalledWith(organizationMemberId, {
      url: 'https://cdn.example.com/face.jpg',
      focal: { x: 50, y: 50 },
    });
  });

  it('сохраняет точку кадрирования, когда мастер её поставила', async () => {
    const { controller, setAvatar } = build();
    await controller.setAvatar(request, {
      url: 'https://cdn.example.com/face.jpg',
      focal: { x: 20, y: 80 },
    });

    expect(setAvatar).toHaveBeenCalledWith(organizationMemberId, {
      url: 'https://cdn.example.com/face.jpg',
      focal: { x: 20, y: 80 },
    });
  });

  it('отклоняет ссылку, а не обнуляет её молча', async () => {
    const { controller, setAvatar } = build();

    await expect(
      controller.setAvatar(request, {
        url: 'javascript:alert(1)',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    /* Сохранение, после которого фотографии нет и никто не сказал почему,
       читается мастером как поломка продукта. */
    expect(setAvatar).not.toHaveBeenCalled();
  });

  it('снимает портрет, не трогая ничего другого', async () => {
    const { controller, setAvatar } = build();
    await controller.clearAvatar(request);
    expect(setAvatar).toHaveBeenCalledWith(organizationMemberId, null);
  });
});
