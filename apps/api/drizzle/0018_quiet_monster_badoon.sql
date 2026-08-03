CREATE TABLE "service_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"addon_service_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_addons_not_self" CHECK ("service_addons"."service_id" <> "service_addons"."addon_service_id")
);
--> statement-breakpoint
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_addon_service_id_services_id_fk" FOREIGN KEY ("addon_service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_addons_pair_unique" ON "service_addons" USING btree ("service_id","addon_service_id");