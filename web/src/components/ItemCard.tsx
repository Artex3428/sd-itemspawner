import { useState } from 'react';
import { formatWeight } from '@/lib/search';
import type { CatalogItem } from '@/types';

export const CARD_HEIGHT = 124;
export const CARD_HEIGHT_INFO = 152;
export const CARD_MIN_WIDTH = 134;
export const CARD_GAP = 10;

function ItemImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="select-none font-mono text-base text-faint/60">
        {label.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      className="max-h-full max-w-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
    />
  );
}

interface ItemCardProps {
  item: CatalogItem;
  imagePath: string;
  selected: boolean;
  count: number | null;
  focused: boolean;
  showInfo: boolean;
  onClick: () => void;
}

export function ItemCard({
  item,
  imagePath,
  selected,
  count,
  focused,
  showInfo,
  onClick,
}: ItemCardProps) {
  const tone = selected
    ? 'border-select/50 bg-high ring-1 ring-inset ring-select/30'
    : focused
      ? 'border-edge bg-raise'
      : 'border-line bg-raise hover:border-edge hover:bg-high';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: showInfo ? CARD_HEIGHT_INFO : CARD_HEIGHT }}
      className={`group relative flex flex-col overflow-hidden rounded-md border p-2 text-left
                  transition-colors duration-100 ${tone}`}
    >
      <span
        className={`block truncate text-2xs leading-tight transition-colors ${
          selected ? 'text-ink' : 'text-muted group-hover:text-ink'
        }`}
        title={item.label}
      >
        {item.label}
      </span>

      <span className="grid min-h-0 flex-1 place-items-center px-1 py-1.5">
        <ItemImage src={`${imagePath}${item.image}`} label={item.label} />
      </span>

      {showInfo && (
        <span className="mt-auto block border-t border-line/70 pt-1.5">
          <span className="block truncate font-mono text-2xs text-faint" title={item.name}>
            {item.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 font-mono text-2xs text-faint/80">
            {formatWeight(item.weight)}
            {!item.stack && <span className="text-faint/60">· no stack</span>}
          </span>
        </span>
      )}

      {selected && count !== null && (
        <span
          className="absolute right-1.5 top-1.5 grid h-4 min-w-[1rem] place-items-center rounded
                     bg-select px-1 font-mono text-2xs font-semibold tabular-nums text-panel"
        >
          {count}
        </span>
      )}
    </button>
  );
}
