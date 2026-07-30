export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
        Beauty.lv
      </span>
      <h1 className="max-w-md text-3xl font-semibold tracking-tight text-ink text-balance">
        Онлайн-запись, которая не требует объяснений
      </h1>
      <p className="max-w-sm text-base text-ink-soft">
        Платформа в разработке. Публичная страница мастера и рабочий кабинет появятся здесь.
      </p>
    </main>
  );
}
