import { IsISO8601, IsOptional, IsUUID, ValidateIf } from 'class-validator';

/**
 * Куда мастер переносит визит: в открытое окно или в названный ею час.
 *
 * Ровно одно из двух должно прийти, и это проверяется, а не подразумевается:
 * запрос без единого поля молча ничего не делал бы, отвечая при этом успехом.
 * Если пришли оба, побеждает окно — оно уже существует, и открывать под тот же
 * визит второе значило бы плодить пустые окна в календаре.
 *
 * Право назвать произвольный час есть только у мастера. Публичная страница
 * переносит визит лишь в опубликованное окно (`RescheduleBookingDto`) — то же
 * правило, что у создания записи.
 */
export class RescheduleByMasterDto {
  @ValidateIf((dto: RescheduleByMasterDto) => !dto.startsAt)
  @IsUUID()
  publishedSlotId?: string;

  @ValidateIf((dto: RescheduleByMasterDto) => !dto.publishedSlotId)
  @IsISO8601()
  startsAt?: string;

  /**
   * К кому переносят — перетаскивание визита в колонку коллеги в командном
   * дне. Пусто — к тому же мастеру. Решает право `org:schedule:manage-others`.
   */
  @IsOptional()
  @IsUUID()
  organizationMemberId?: string;
}
