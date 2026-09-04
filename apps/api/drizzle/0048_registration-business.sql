-- Название дела и его форма — в заявке на регистрацию.
--
-- Форма регистрации из макета спрашивает их у мастера («Business name»,
-- «Solo / Team»), а панель платформы показывает их в списке заявок и в
-- карточке. До этого одобрение заявки заводило салон, названный по имени
-- человека, и всегда одиночным: «Анна Озола» вместо «Studio Nara», и «solo»
-- у салона с четырьмя мастерами.
--
-- Обе колонки допускают NULL: заявки, поданные до этой правки, названия дела
-- не содержат, и выдумывать его за человека нельзя. Одобрение такой заявки
-- по-прежнему берёт имя мастера — ровно как раньше.
CREATE TYPE "registration_business_type" AS ENUM ('solo', 'salon');--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD COLUMN "business_type" "registration_business_type";
