-- Заблокированное время мастера (спецификация дашборда §24): обед, учёба,
-- личное дело, отпуск.
--
-- Своя таблица, а не «скрытые окна». Скрытое окно — это время, которое мастер
-- открыла, но не предлагает клиентам; блок — время, в котором её нет вовсе, и
-- у него есть название, которое видит администратор. Сложи их в одно, и
-- «уехала на обед» стало бы неотличимо от «пока не решила, продавать ли».
--
-- Блок — конкретный интервал, а не правило повторения (SALON.md §6.2): «обед
-- каждый четверг» заводит столько строк, сколько недель, и больничный в один
-- из четвергов правится удалением одной строки, а не исключением из правила.
CREATE TABLE "time_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "organization_member_id" uuid NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "title" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "time_blocks_ends_after_starts" CHECK ("ends_at" > "starts_at")
);
--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- «Есть ли у мастера блок в этом часе» — вопрос публикации окна и ручной
-- записи, и задают его по одному человеку.
CREATE INDEX "time_blocks_member_starts_at_idx" ON "time_blocks" ("organization_member_id","starts_at");
--> statement-breakpoint
-- Командный календарь спрашивает блоки всей организации за день или неделю.
CREATE INDEX "time_blocks_organization_starts_at_idx" ON "time_blocks" ("organization_id","starts_at");
