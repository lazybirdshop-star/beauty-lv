import { registerDecorator, type ValidationOptions } from 'class-validator';
import { sanitizeHexColor } from '@amolie/shared-kernel';

/**
 * Every value in the object must be a hex colour.
 *
 * Exists because `@IsObject()` on a colour map accepts any string, and these
 * particular strings are rendered into the `<style>` element of a public page
 * (see `UpdateProfileDto.themeOverrides`). The check delegates to
 * `sanitizeHexColor` in shared-kernel rather than carrying its own regular
 * expression: the resolver that draws the page decides what a colour is, and a
 * second definition here would be free to disagree with it.
 *
 * Keys are left unconstrained on purpose — an unknown key is dropped when the
 * overrides are read (`pageDesignFromLegacy` looks up three by name), so it
 * can only be dead weight, never a value that reaches the page.
 */
export function IsHexColorMap(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isHexColorMap',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} accepts hex colours only`,
        ...options,
      },
      validator: {
        validate(value: unknown): boolean {
          // `null` clears the overrides; absence is handled by `@IsOptional`.
          if (value === null) return true;
          if (typeof value !== 'object') return false;

          return Object.values(value as Record<string, unknown>).every(
            (entry) => sanitizeHexColor(entry) !== null,
          );
        },
      },
    });
  };
}
