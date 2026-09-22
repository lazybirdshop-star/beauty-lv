import { Skeleton } from '@/components/ui/skeleton';

/**
 * Что стоит на месте раздела кабинета, пока сервер собирает ответ.
 *
 * Без этого файла переход между разделами задерживался целиком: браузер
 * оставался на прежнем экране, пока страница не соберётся на сервере, — и
 * нажатие выглядело непринятым. Оболочка (шапка, навигация) при этом уже
 * готова, ждут только данные раздела.
 *
 * Форма намеренно общая — заголовок и несколько строк: это не имитация
 * конкретного экрана, а обещание, что место занято и ответ идёт. Подделка
 * чужого макета здесь стоила бы дороже: каждый экран пришлось бы повторять
 * дважды и держать оба в согласии.
 */
export default function DashboardSectionLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-6" role="status" aria-busy="true">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-24 w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
