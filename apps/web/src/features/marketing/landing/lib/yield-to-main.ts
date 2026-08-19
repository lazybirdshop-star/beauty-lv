/* Отдать управление браузеру посреди длинной работы.

   Сборка сцены — разбор 614-килобайтной модели, клонирование устройств,
   пре-фильтрация окружения, первый кадр — шла одной задачей на 1138 мс при
   четырёхкратном замедлении процессора. Всё это время страница не отвечала
   на касания, и ровно эта задача составляла почти весь Total Blocking Time.

   Работа никуда не делась и быстрее не стала — она разрезана на куски по
   границам этапов. Для отзывчивости это и есть лечение: браузер успевает
   обработать касание между кусками, а не после всей стройки. */

type SchedulerWithYield = { yield?: () => Promise<void> };

/**
 * `scheduler.yield()` там, где он есть: он возвращает управление в ту же
 * очередь и не пускает вперёд чужие задачи, поэтому сборка не растягивается.
 * Иначе — макрозадача через `MessageChannel`: `setTimeout` в фоновой вкладке
 * зажимают до секунды, а канал доставляет сообщение сразу.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
  if (scheduler?.yield) return scheduler.yield();

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
