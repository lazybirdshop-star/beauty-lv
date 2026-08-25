/**
 * Отрисовка блоков документа.
 *
 * Разрешённых форм ровно три — абзац, список, таблица, — и это не упрощение,
 * а граница: юридический текст, набранный произвольным HTML, невозможно
 * перевести, невозможно проверить и невозможно показать одинаково на трёх
 * языках. Всё, что документу нужно сказать, укладывается в эти три.
 */
import type { LegalBlock } from '../model';

/** Ссылка в ячейке таблицы: адреса политик подрядчиков кликабельны. */
function Cell({ value }: { value: string }) {
  if (!value.startsWith('https://')) return <>{value}</>;

  return (
    <a className="legal__cell-link" href={value} target="_blank" rel="noreferrer noopener">
      {value.replace(/^https:\/\//, '').replace(/\/$/, '')}
    </a>
  );
}

export function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'text':
      return <p className="legal__text">{block.text}</p>;

    case 'list':
      return (
        <ul className="legal__list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case 'table':
      return (
        /* Собственная полоса прокрутки, а не прокрутка страницы вбок: у
           таблицы подрядчиков четыре колонки, и на телефоне она шире экрана
           при любом наборе. `tabindex` — чтобы до неё добралась клавиатура. */
        <div className="legal__table-scroll" tabIndex={0} role="group">
          <table className="legal__table">
            {block.caption ? <caption>{block.caption}</caption> : null}
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, index) => (
                    <td key={`${index}-${cell}`} data-label={block.head[index]}>
                      <Cell value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
