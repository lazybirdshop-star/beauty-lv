-- Приглашение сотрудника в салон (SALON.md SL-3) и лимит тарифа на число
-- участников (§8.3).
--
-- Своя таблица, а не строка в `user_tokens`: та всегда про существующий
-- аккаунт (`user_id NOT NULL`), а сотрудницу приглашают по адресу почты,
-- которого в продукте может не быть вовсе. Подробности — в комментарии схемы.
CREATE TABLE "organization_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" "organization_member_role" NOT NULL,
  "display_name" text,
  "token_hash" text NOT NULL,
  "invited_by_user_id" uuid NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_member_id" uuid,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organization_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_accepted_member_id_organization_members_id_fk" FOREIGN KEY ("accepted_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Одно живое приглашение на адрес в организации. Условие обязательно:
-- отозванные и принятые остаются историей, и пригласить того же человека
-- второй раз — законное действие.
CREATE UNIQUE INDEX "organization_invites_pending_unique" ON "organization_invites" ("organization_id","email") WHERE accepted_at is null and revoked_at is null;
--> statement-breakpoint
-- Сколько участников разрешает тариф. NULL — без ограничения; организация без
-- подписки тоже без ограничения, и это состояние настройки, а не пропуск
-- проверки: сама проверка стоит на каждом приглашении.
ALTER TABLE "subscription_plans" ADD COLUMN "member_limit" integer;
