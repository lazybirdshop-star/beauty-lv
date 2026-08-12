import { buildMediaObjectPath } from './media-object-path';

/**
 * The path is the whole isolation boundary for uploads: it is the only thing
 * standing between one master's bucket prefix and another's, and it is built
 * here from the organization the guards resolved — never from a file name.
 */
describe('buildMediaObjectPath', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';

  it('files the object under the organization that owns it', () => {
    expect(
      buildMediaObjectPath(organizationId, 'image/webp').startsWith(`${organizationId}/`),
    ).toBe(true);
  });

  it('gives the object an extension matching its declared type', () => {
    expect(buildMediaObjectPath(organizationId, 'image/jpeg')).toMatch(/\.jpg$/);
    expect(buildMediaObjectPath(organizationId, 'image/png')).toMatch(/\.png$/);
    expect(buildMediaObjectPath(organizationId, 'image/webp')).toMatch(/\.webp$/);
  });

  it('never repeats a path, so one upload cannot overwrite another', () => {
    const paths = new Set(
      Array.from({ length: 50 }, () => buildMediaObjectPath(organizationId, 'image/webp')),
    );
    expect(paths.size).toBe(50);
  });

  it('produces exactly one path segment below the organization', () => {
    const [prefix, name, ...rest] = buildMediaObjectPath(organizationId, 'image/webp').split('/');
    expect(prefix).toBe(organizationId);
    expect(rest).toHaveLength(0);
    // No traversal can hide in a name the server generated itself, and the
    // shape is asserted so that stays true if the name ever gains a source.
    expect(name).not.toContain('..');
  });
});
