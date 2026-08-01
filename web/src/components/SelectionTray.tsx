import { X } from 'lucide-react';
import { t } from '@/i18n';
import { useItemMap } from '@/hooks/useItemMap';
import { useSpawner } from '@/store/spawner';

export function SelectionTray() {
  const order = useSpawner((s) => s.order);
  const selection = useSpawner((s) => s.selection);
  const focused = useSpawner((s) => s.focused);
  const limits = useSpawner((s) => s.limits);
  const focus = useSpawner((s) => s.focus);
  const toggle = useSpawner((s) => s.toggle);
  const setCount = useSpawner((s) => s.setCount);
  const clearSelection = useSpawner((s) => s.clearSelection);

  const items = useItemMap();

  return (
    <section className="flex min-h-0 flex-[0_0_38%] flex-col border-t border-line">
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <span className="text-2xs font-medium uppercase tracking-wider text-faint">
          {t.selection}
          {order.length > 0 && (
            <span className="ml-1.5 font-mono normal-case tracking-normal text-muted">
              {order.length}
              <span className="text-faint">/{limits.maxSelection}</span>
            </span>
          )}
        </span>

        {order.length > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            className="rounded px-1.5 py-0.5 text-2xs text-faint transition-colors hover:bg-high hover:text-ink"
          >
            {t.clear}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {order.length === 0 ? (
          <p className="px-2 py-1 text-2xs text-faint">{t.selectionEmpty}</p>
        ) : (
          order.map((name) => {
            const row = selection[name];
            const item = items.get(name);
            if (!row || !item) return null;

            const active = focused === name;

            return (
              <div
                key={name}
                onClick={() => focus(name)}
                className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5
                            transition-colors ${
                              active
                                ? 'border-select/40 bg-high'
                                : 'border-transparent hover:border-line hover:bg-raise'
                            }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-2xs text-ink" title={item.label}>
                    {item.label}
                  </div>
                  <div className="truncate font-mono text-[0.5625rem] text-faint" title={name}>
                    {name}
                  </div>
                </div>

                <input
                  value={row.count}
                  inputMode="numeric"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setCount(name, Number(event.target.value.replace(/\D/g, '')))}
                  className="h-6 w-12 shrink-0 rounded border border-line bg-raise text-center
                             font-mono text-2xs tabular-nums text-ink focus:border-edge focus:outline-none"
                />

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(item);
                  }}
                  className="grid h-6 w-5 shrink-0 place-items-center rounded text-faint
                             transition-colors hover:bg-panel hover:text-bad"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
