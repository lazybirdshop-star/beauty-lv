/**
 * Корпус телефона и его строка состояния.
 *
 * Стоит на странице дважды — в первом экране и в клиентской секции, — и оба
 * раза показывает настоящий интерфейс записи, а не снимок с фотографии. На
 * самих фотографиях экранов нет намеренно: снятый экран стареет вместе с
 * кадром, а нарисованный обновляется вместе с продуктом.
 */
import type { ReactNode } from 'react';

export function PhoneStatus({ time }: { time: string }) {
  return (
    <div className="phone__status">
      <span>{time}</span>
      <span className="phone__icons">
        <svg viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx=".6" />
          <rect x="4.4" y="5.5" width="3" height="6.5" rx=".6" />
          <rect x="8.8" y="3" width="3" height="9" rx=".6" />
          <rect x="13.2" y="0" width="2.8" height="12" rx=".6" />
        </svg>
        <svg
          viewBox="0 0 16 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M1.5 4.6a10 10 0 0 1 13 0M4.2 7.4a6 6 0 0 1 7.6 0M6.7 10.1a2.2 2.2 0 0 1 2.6 0" />
        </svg>
        <svg
          viewBox="0 0 24 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <rect x=".6" y=".6" width="19" height="10.8" rx="3" />
          <rect
            x="2.6"
            y="2.6"
            width="14"
            height="6.8"
            rx="1.6"
            fill="currentColor"
            stroke="none"
          />
          <path d="M21.6 4v4" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

export function Phone({
  className,
  dataUi,
  children,
}: {
  className?: string;
  dataUi?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ? `phone ${className}` : 'phone'} data-ui={dataUi}>
      <div className="phone__notch" />
      {children}
    </div>
  );
}
