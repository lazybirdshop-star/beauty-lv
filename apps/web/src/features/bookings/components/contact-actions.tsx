'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { instagramLink, smsLink, telLink, whatsAppLink } from '../contact-links';

/**
 * «Позвонить» и «Написать» — рядом, одной парой на карточке ближайшего
 * визита, в панели визита и на странице клиента (approved N-6).
 *
 * Позвонить — розовая ниша (единственное мягкое действие системы), написать
 * — контур с меню из трёх глубоких ссылок: SMS, WhatsApp, Instagram (когда
 * есть хэндл). Ничего не отправляется продуктом — открывается мессенджер.
 */
export function ContactActions({
  phone,
  instagram,
  layout = 'row',
  size = 'sm',
  tone = 'soft',
  className,
}: {
  phone: string | null;
  instagram?: string | null;
  layout?: 'row' | 'column';
  size?: 'sm' | 'pill';
  /** `plain` — обе кнопки контуром со значками, как в карточке визита прототипа. */
  tone?: 'soft' | 'plain';
  className?: string;
}) {
  const t = useT();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const node = menu.current;
    if (!node) return;
    const close = (event: Event) => {
      if (!node.open) return;
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && node.contains(event.target as Node)) return;
      node.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  if (!phone && !instagram) return null;

  return (
    <div
      className={cn('contact-actions', layout === 'column' && 'contact-actions--column', className)}
    >
      {phone ? (
        <Button asChild variant={tone === 'plain' ? 'secondary' : 'soft'} size={size}>
          <a href={telLink(phone)}>
            {tone === 'plain' ? <Icon name="phone" className="ico-16" /> : null}
            {t.bookings.callClient}
          </a>
        </Button>
      ) : null}
      <details className="row-menu contact-actions__write" ref={menu}>
        <Button asChild variant="secondary" size={size}>
          <summary>
            {tone === 'plain' ? <Icon name="messageCircle" className="ico-16" /> : null}
            {t.bookings.write}
          </summary>
        </Button>
        <div
          className="popover-surface row-menu__list"
          onClick={() => {
            if (menu.current) menu.current.open = false;
          }}
        >
          {phone ? (
            <a className="menu-item" href={smsLink(phone)}>
              <Icon name="messageCircle" className="ico-18" />
              {t.bookings.writeSms}
            </a>
          ) : null}
          {phone ? (
            <a className="menu-item" href={whatsAppLink(phone)} target="_blank" rel="noreferrer">
              <Icon name="phone" className="ico-18" />
              {t.bookings.writeWhatsApp}
            </a>
          ) : null}
          {instagram ? (
            <a
              className="menu-item"
              href={instagramLink(instagram)}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="instagram" className="ico-18" />
              {t.bookings.writeInstagram}
            </a>
          ) : null}
        </div>
      </details>
    </div>
  );
}
