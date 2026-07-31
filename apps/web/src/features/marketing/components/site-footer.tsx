export function SiteFooter() {
  return (
    <footer className="border-t border-border px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-ink-faint md:flex-row">
        <span className="font-semibold text-ink">Beauty.lv</span>
        <span>Rīga, Latvija · © {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
