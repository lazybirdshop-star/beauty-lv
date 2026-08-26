import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';

/**
 * Не проверка поведения, а проверка сборки контейнера.
 *
 * `ClientThrottlerGuard` стоит глобальной охраной (`APP_GUARD` в
 * `AppModule`) и теперь просит `JwtService`, чтобы считать по личности
 * только за проверенной подписью. Провайдер, который некому разрешить,
 * роняет приложение на старте и не виден ни компилятору, ни тестам на
 * моках: там охрана создаётся вручную, конструктором.
 */
describe('AppModule — контейнер собирается', () => {
  it('разрешает все провайдеры, включая охрану лимитера', async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleFixture.createNestApplication();

    await app.init();
    await app.close();
  });
});
