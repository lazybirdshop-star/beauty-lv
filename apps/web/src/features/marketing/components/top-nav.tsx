import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="text-[17px] font-semibold tracking-tight text-ink">
          AMOLIE
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Войти</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Регистрация</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
