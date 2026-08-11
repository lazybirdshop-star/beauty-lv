CREATE TABLE "page_design_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"design" jsonb NOT NULL,
	"published_by_user_id" uuid,
	"reverted_from_version" integer,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "page_design" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "page_design_draft" jsonb;--> statement-breakpoint
ALTER TABLE "page_design_versions" ADD CONSTRAINT "page_design_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_design_versions" ADD CONSTRAINT "page_design_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_design_versions_org_published_idx" ON "page_design_versions" USING btree ("organization_id","published_at");