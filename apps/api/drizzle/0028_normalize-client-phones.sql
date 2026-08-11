-- Re-normalize stored client phones to the canonical form.
--
-- `normalizePhone` used to strip whitespace only, so "+371-26-123-456" was
-- stored with its dashes and did not collide with "+371 26 123 456" — the same
-- person as two rows. The function now removes every separator and reads a
-- leading `00` as `+`; this brings existing rows in line with it, so the
-- address book keeps de-duplicating from here on.
--
-- Rows whose new value would collide with an existing one in the same
-- organization are left untouched on purpose. Those two rows ARE the same
-- person, and merging them means choosing which name, which notes and which
-- flag survive — a decision that belongs to the master, not to a migration
-- running unattended. They stay visible, still working, and still matched by
-- `phoneMatchKey` where matching matters.
UPDATE "clients" AS c
SET "phone" = n.canonical,
    "updated_at" = now()
FROM (
  SELECT
    "id",
    "organization_id",
    CASE
      WHEN "phone" LIKE '+%'
        THEN '+' || regexp_replace("phone", '\D', '', 'g')
      WHEN regexp_replace("phone", '\D', '', 'g') LIKE '00%'
        THEN '+' || substr(regexp_replace("phone", '\D', '', 'g'), 3)
      ELSE regexp_replace("phone", '\D', '', 'g')
    END AS canonical
  FROM "clients"
) AS n
WHERE c."id" = n."id"
  AND c."phone" <> n.canonical
  AND n.canonical <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "clients" AS other
    WHERE other."organization_id" = n."organization_id"
      AND other."phone" = n.canonical
      AND other."id" <> n."id"
  );
