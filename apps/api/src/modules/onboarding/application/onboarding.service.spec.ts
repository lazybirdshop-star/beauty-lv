import type { OrganizationRow } from '../../../shared/database/schema/organizations';
import type { OrganizationsRepository } from '../../organizations/infrastructure/organizations.repository';
import type { OnboardingRepository } from '../infrastructure/onboarding.repository';
import { OnboardingService } from './onboarding.service';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

function organization(overrides: Partial<OrganizationRow> = {}): OrganizationRow {
  return {
    id: ORG_ID,
    slug: 'anna',
    slugChosenAt: null,
    description: null,
    pageDesign: null,
    onboardingCompletedAt: null,
    ...overrides,
  } as OrganizationRow;
}

function setup(
  facts: {
    organization?: Partial<OrganizationRow>;
    serviceCount?: number;
    publishedSlotCount?: number;
    bookingCount?: number;
  } = {},
) {
  const collectFacts = jest.fn().mockResolvedValue({
    organization: organization(facts.organization),
    serviceCount: facts.serviceCount ?? 0,
    publishedSlotCount: facts.publishedSlotCount ?? 0,
    bookingCount: facts.bookingCount ?? 0,
  });
  const setCompletedAt = jest.fn().mockResolvedValue(undefined);
  const findMineForUser = jest.fn().mockResolvedValue({ id: ORG_ID });

  const service = new OnboardingService(
    { collectFacts, setCompletedAt } as unknown as OnboardingRepository,
    { findMineForUser } as unknown as OrganizationsRepository,
  );

  return { service, setCompletedAt };
}

function doneKeys(steps: { key: string; done: boolean }[]): string[] {
  return steps.filter((step) => step.done).map((step) => step.key);
}

describe('OnboardingService', () => {
  it('новый мастер не прошёл ни одного шага', async () => {
    const { service } = setup();

    const status = await service.getStatus(USER_ID);

    expect(doneKeys(status.steps)).toEqual([]);
    expect(status.nextStep).toBe('address');
    expect(status.completedAt).toBeNull();
  });

  /* Прогресс считается по данным, а не по сохранённым галочкам: мастер, у
     которой всё настроено, обязана видеть шаги закрытыми — даже если она
     проходила настройку до появления этого экрана. */
  it('читает шаги из состояния кабинета', async () => {
    const { service } = setup({
      organization: {
        slugChosenAt: new Date(),
        description: 'Маникюр и уход',
        pageDesign: {} as OrganizationRow['pageDesign'],
      },
      serviceCount: 3,
      publishedSlotCount: 12,
      bookingCount: 1,
    });

    const status = await service.getStatus(USER_ID);

    expect(doneKeys(status.steps)).toEqual([
      'address',
      'profile',
      'design',
      'services',
      'schedule',
      'share',
    ]);
    expect(status.nextStep).toBeNull();
  });

  it('пустое описание не считается заполненным профилем', async () => {
    const { service } = setup({ organization: { description: '   ' } });

    const status = await service.getStatus(USER_ID);

    expect(doneKeys(status.steps)).not.toContain('profile');
  });

  /* Первую запись делает клиент, а не мастер. Шаг остаётся в списке как
     финал, но не держит настройку незакрытой. */
  it('не требует первой записи для завершения', async () => {
    const { service } = setup({
      organization: {
        slugChosenAt: new Date(),
        description: 'Маникюр',
        pageDesign: {} as OrganizationRow['pageDesign'],
      },
      serviceCount: 1,
      publishedSlotCount: 1,
    });

    const status = await service.getStatus(USER_ID);

    expect(status.nextStep).toBeNull();
    expect(status.steps.find((step) => step.key === 'share')?.optional).toBe(true);
  });

  it('повторное завершение не сдвигает дату', async () => {
    const completedAt = new Date('2026-08-01T10:00:00.000Z');
    const { service, setCompletedAt } = setup({
      organization: { onboardingCompletedAt: completedAt },
    });

    const status = await service.complete(USER_ID);

    expect(status.completedAt).toBe(completedAt.toISOString());
    expect(setCompletedAt).not.toHaveBeenCalled();
  });

  it('перезапуск снимает отметку о завершении', async () => {
    const { service, setCompletedAt } = setup({
      organization: { onboardingCompletedAt: new Date() },
    });

    const status = await service.restart(USER_ID);

    expect(setCompletedAt).toHaveBeenCalledWith(ORG_ID, null);
    expect(status.completedAt).toBeNull();
  });
});
