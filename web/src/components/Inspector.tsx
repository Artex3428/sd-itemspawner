import { useState } from 'react';
import { Minus, MousePointerClick, Plus } from 'lucide-react';
import { t } from '@/i18n';
import { formatWeight } from '@/lib/search';
import { useItemMap } from '@/hooks/useItemMap';
import { useSpawner } from '@/store/spawner';
import { MetadataEditor } from './MetadataEditor';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="text-2xs text-faint">{label}</span>
      <span className="truncate font-mono text-2xs text-muted">{value}</span>
    </div>
  );
}

function HeroImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-line bg-canvas p-2">
      {failed ? (
        <span className="select-none font-mono text-xl text-faint/60">
          {label.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]"
        />
      )}
    </div>
  );
}

export function Inspector() {
  const focused = useSpawner((s) => s.focused);
  const selection = useSpawner((s) => s.selection);
  const imagePath = useSpawner((s) => s.imagePath);
  const limits = useSpawner((s) => s.limits);
  const setCount = useSpawner((s) => s.setCount);
  const setMeta = useSpawner((s) => s.setMeta);
  const toggle = useSpawner((s) => s.toggle);

  const items = useItemMap();
  const item = focused ? (items.get(focused) ?? null) : null;

  if (!item) {
    return (
      <div className="grid flex-1 place-items-center px-6">
        <div className="text-center">
          <MousePointerClick className="mx-auto h-5 w-5 text-faint/50" strokeWidth={1.5} />
          <p className="mt-3 text-xs text-muted">{t.inspectorEmpty}</p>
          <p className="mt-1 text-2xs leading-relaxed text-faint">{t.inspectorHint}</p>
        </div>
      </div>
    );
  }

  const row = selection[item.name];
  const quick = [1, 5, 10, 50, limits.maxCount];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="flex gap-3">
        <HeroImage src={`${imagePath}${item.image}`} label={item.label} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium leading-tight text-ink" title={item.label}>
            {item.label}
          </h2>
          <p className="mt-1 truncate font-mono text-2xs text-faint" title={item.name}>
            {item.name}
          </p>
          <span className="mt-2 inline-block rounded border border-line bg-raise px-1.5 py-0.5 text-2xs text-muted">
            {t.categories[item.category]}
          </span>
        </div>
      </div>

      {item.description && (
        <p className="mt-3 border-l border-line pl-2.5 text-2xs leading-relaxed text-muted">
          {item.description}
        </p>
      )}

      <div className="mt-3 border-t border-line pt-2">
        <Stat label={t.weight} value={formatWeight(item.weight)} />
        <Stat label={t.stacks} value={item.stack ? t.yes : t.no} />
        <Stat label={t.closes} value={item.close ? t.yes : t.no} />
        {item.degrade !== undefined && (
          <Stat label={t.degrades} value={`${item.degrade} min`} />
        )}
        {item.ammoname && <Stat label={t.usesAmmo} value={item.ammoname} />}
      </div>

      {row ? (
        <>
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1.5 text-2xs font-medium uppercase tracking-wider text-faint">
              {t.amount}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCount(item.name, row.count - 1)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line
                           bg-raise text-muted transition-colors hover:border-edge hover:bg-high hover:text-ink"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>

              <input
                value={row.count}
                inputMode="numeric"
                onChange={(event) => setCount(item.name, Number(event.target.value.replace(/\D/g, '')))}
                className="h-8 min-w-0 flex-1 rounded-md border border-line bg-raise text-center
                           font-mono text-xs tabular-nums text-ink focus:border-edge focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setCount(item.name, row.count + 1)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line
                           bg-raise text-muted transition-colors hover:border-edge hover:bg-high hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-1.5 flex gap-1">
              {quick.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setCount(item.name, amount)}
                  className={`flex-1 rounded border py-1 font-mono text-2xs tabular-nums transition-colors ${
                    row.count === amount
                      ? 'border-select/50 bg-high text-ink'
                      : 'border-line bg-raise text-faint hover:border-edge hover:text-muted'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <MetadataEditor
              itemName={item.name}
              metadata={row.metadata}
              onChange={(metadata) => setMeta(item.name, metadata)}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => toggle(item)}
          className="mt-4 w-full rounded-md border border-edge bg-raise py-2 text-xs text-muted
                     transition-colors hover:bg-high hover:text-ink"
        >
          Add to selection
        </button>
      )}
    </div>
  );
}
