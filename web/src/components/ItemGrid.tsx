import { SearchX } from 'lucide-react';
import { t } from '@/i18n';
import { useVirtualGrid } from '@/hooks/useVirtualGrid';
import { useSpawner } from '@/store/spawner';
import type { CatalogItem } from '@/types';
import { CARD_GAP, CARD_HEIGHT, CARD_HEIGHT_INFO, CARD_MIN_WIDTH, ItemCard } from './ItemCard';

export function ItemGrid({ items }: { items: CatalogItem[] }) {
  const showInfo = useSpawner((s) => s.showInfo);
  const imagePath = useSpawner((s) => s.imagePath);
  const selection = useSpawner((s) => s.selection);
  const focused = useSpawner((s) => s.focused);
  const toggle = useSpawner((s) => s.toggle);

  const rowHeight = showInfo ? CARD_HEIGHT_INFO : CARD_HEIGHT;
  const grid = useVirtualGrid(items.length, rowHeight, CARD_MIN_WIDTH, CARD_GAP);

  return (
    <div ref={grid.ref} className="min-h-0 flex-1 overflow-y-auto p-3">
      {items.length === 0 ? (
        <div className="grid h-full place-items-center">
          <div className="text-center">
            <SearchX className="mx-auto h-6 w-6 text-faint/60" strokeWidth={1.5} />
            <p className="mt-3 text-xs text-muted">{t.noResults}</p>
            <p className="mt-1 text-2xs text-faint">{t.noResultsHint}</p>
          </div>
        </div>
      ) : (
        <div style={{ height: grid.totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${grid.offsetY}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
              gap: CARD_GAP,
            }}
          >
            {items.slice(grid.start, grid.end).map((item) => (
              <ItemCard
                key={item.name}
                item={item}
                imagePath={imagePath}
                selected={Boolean(selection[item.name])}
                count={selection[item.name]?.count ?? null}
                focused={focused === item.name}
                showInfo={showInfo}
                onClick={() => toggle(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
