/* Adds .is-in once the block enters the viewport, so every child marked .rise
   runs the 900ms / 28px / blur-14 entrance from the design system. */
import { useEffect, useRef, useState, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'header' | 'footer' | 'li' | 'article';
  threshold?: number;
  id?: string;
};

export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  threshold = 0.15,
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag id={id} ref={ref as React.Ref<never>} className={`${className}${inView ? ' is-in' : ''}`}>
      {children}
    </Tag>
  );
}
