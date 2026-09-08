-- Как показывать прайс на странице записи.
--
-- В артборде `ServicesShowcase.dc.html` рядом с «Показывать цены» стоят ещё
-- два переключателя: «Показывать длительность» и «Группировать по
-- категориям». Первого у продукта не было вовсе, второй был решён за мастера —
-- группировка включалась сама, если категории заведены.
--
-- Оба по умолчанию включены: так страница выглядит сегодня, и выкат не должен
-- менять ни одной живой страницы.
ALTER TABLE "organizations" ADD COLUMN "show_service_durations" boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "group_services_by_category" boolean NOT NULL DEFAULT true;
