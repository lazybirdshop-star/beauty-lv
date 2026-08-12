import { IsString, MaxLength } from 'class-validator';

/**
 * Deliberately loose for a value with strict rules.
 *
 * The address is normalized before it is judged (`normalizePublicSlug`), so a
 * pasted `https://amolie.com/anna/` is a valid request — rejecting it here as
 * a format error would refuse the most natural thing a master can do with a
 * link she already has. `MaxLength` is only a guard against a megabyte of
 * text reaching the normalizer; the real length rule lives in shared-kernel
 * and answers with a reason the panel can translate.
 */
export class ChangeSlugDto {
  @IsString()
  @MaxLength(200)
  slug!: string;
}
