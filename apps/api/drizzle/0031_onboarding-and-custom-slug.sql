CREATE TABLE "organization_slug_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_history_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "slug_chosen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization_slug_history" ADD CONSTRAINT "organization_slug_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_slug_history_org_idx" ON "organization_slug_history" USING btree ("organization_id");--> statement-breakpoint
-- Masters who registered before guided onboarding existed have already been
-- through the panel by hand. Marking them complete is the honest reading of
-- their state: the alternative greets a working salon with «Первые шаги» and a
-- checklist it cannot tick, because nothing recorded that she did all this
-- months ago. The wizard stays reachable from the panel for anyone who wants
-- to walk it anyway.
UPDATE "organizations" SET "onboarding_completed_at" = "created_at" WHERE "onboarding_completed_at" IS NULL;
