import { Global, Module } from '@nestjs/common';

import { PlatformSettingsRepository } from '../infrastructure/platform-settings.repository';
import { PlatformSettingsController } from './platform-settings.controller';

/**
 * Настройки платформы нужны половине продукта: режим регистрации решает,
 * заводить аккаунт или заявку; «запись остановлена» проверяется на каждой
 * гостевой записи; режим обслуживания — глобальной охраной, которая живёт
 * вне модулей вовсе.
 *
 * Поэтому модуль глобальный, а репозиторий объявлен один раз. Прежде он
 * повторялся в `providers` каждого желающего, и каждая копия была своим
 * экземпляром — то есть четыре независимых чтения одной таблицы из трёх
 * строк, которые невозможно потом кешировать в одном месте.
 */
@Global()
@Module({
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsRepository],
  exports: [PlatformSettingsRepository],
})
export class PlatformSettingsModule {}
