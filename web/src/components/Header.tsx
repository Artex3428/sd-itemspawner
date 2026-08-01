import { useEffect, useRef } from 'react';
import { Package, Search, X } from 'lucide-react';
import { t } from '@/i18n';
import { useSpawner } from '@/store/spawner';

interface HeaderProps {
  visible: number;
  total: number;
}

export function Header({ visible, total }: HeaderProps) {
  const query = useSpawner((s) => s.query);
  const setQuery = useSpawner((s) => s.setQuery);
  const showInfo = useSpawner((s) => s.showInfo);
  const toggleInfo = useSpawner((s) => s.toggleInfo);
  const closePanel = useSpawner((s) => s.closePanel);

  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-line bg-raise">
          <Package className="h-4 w-4 text-muted" strokeWidth={1.75} />
        </div>
        <div className="leading-none">
          <div className="text-[0.8125rem] font-medium tracking-tight text-ink">{t.title}</div>
          <div className="mt-1 font-mono text-2xs text-faint">{t.subtitle}</div>
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
          strokeWidth={2}
        />
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          spellCheck={false}
          autoComplete="off"
          className="h-9 w-full rounded-md border border-line bg-raise pl-9 pr-9 text-sm text-ink
                     placeholder:text-faint focus:border-edge focus:outline-none focus:ring-1
                     focus:ring-edge"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center
                       rounded text-faint transition-colors hover:bg-high hover:text-ink"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="shrink-0 font-mono text-2xs tabular-nums text-faint">
        {visible === total ? total : `${visible} / ${total}`}
      </div>

      <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 text-2xs text-muted transition-colors hover:text-ink">
        <span
          className={`grid h-3.5 w-3.5 place-items-center rounded-sm border transition-colors ${
            showInfo ? 'border-select bg-select' : 'border-edge bg-raise'
          }`}
        >
          {showInfo && <span className="h-1.5 w-1.5 rounded-[1px] bg-panel" />}
        </span>
        <input type="checkbox" checked={showInfo} onChange={toggleInfo} className="sr-only" />
        {t.showInfo}
      </label>

      <button
        type="button"
        onClick={closePanel}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-raise
                   text-muted transition-colors hover:border-edge hover:bg-high hover:text-ink"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </header>
  );
}
