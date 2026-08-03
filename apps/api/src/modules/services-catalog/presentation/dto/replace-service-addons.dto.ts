import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class ReplaceServiceAddonsDto {
  /**
   * The full chain, empty array clears it. Capped because this list is
   * rendered as a choice to every client — a hundred suggestions is not a
   * suggestion.
   */
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  addonServiceIds!: string[];
}
