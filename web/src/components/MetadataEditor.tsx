import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { t } from '@/i18n';
import type { MetaValue } from '@/types';

interface Row {
  id: number;
  key: string;
  value: string;
}

function coerce(raw: string): MetaValue {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) return Number(trimmed);
  return raw;
}

function badgeOf(raw: string): string {
  const value = coerce(raw);
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return 'num';
  return 'text';
}

interface MetadataEditorProps {
  itemName: string;
  metadata: Record<string, MetaValue>;
  onChange: (metadata: Record<string, MetaValue>) => void;
}

export function MetadataEditor({ itemName, metadata, onChange }: MetadataEditorProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const nextId = useRef(0);
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (seededFor.current === itemName) return;
    seededFor.current = itemName;
    setRows(
      Object.entries(metadata).map(([key, value]) => ({
        id: nextId.current++,
        key,
        value: String(value),
      })),
    );
  }, [itemName, metadata]);

  const emit = (next: Row[]) => {
    setRows(next);

    const out: Record<string, MetaValue> = {};
    for (const row of next) {
      const key = row.key.trim();
      if (key) out[key] = coerce(row.value);
    }
    onChange(out);
  };

  const update = (id: number, patch: Partial<Row>) =>
    emit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-wider text-faint">{t.metadata}</span>
        <button
          type="button"
          onClick={() => emit([...rows, { id: nextId.current++, key: '', value: '' }])}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs text-faint transition-colors hover:bg-high hover:text-ink"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          {t.metadataAdd}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-2xs leading-relaxed text-faint">{t.metadataHint}</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-1">
              <input
                value={row.key}
                placeholder={t.metadataKey}
                spellCheck={false}
                onChange={(event) => update(row.id, { key: event.target.value })}
                className="h-7 w-[38%] shrink-0 rounded border border-line bg-raise px-2 font-mono
                           text-2xs text-ink placeholder:text-faint focus:border-edge focus:outline-none"
              />
              <div className="relative min-w-0 flex-1">
                <input
                  value={row.value}
                  placeholder={t.metadataValue}
                  spellCheck={false}
                  onChange={(event) => update(row.id, { value: event.target.value })}
                  className="h-7 w-full rounded border border-line bg-raise px-2 pr-10 font-mono
                             text-2xs text-ink placeholder:text-faint focus:border-edge focus:outline-none"
                />
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-panel px-1 font-mono text-[0.5625rem] text-faint">
                  {badgeOf(row.value)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => emit(rows.filter((entry) => entry.id !== row.id))}
                className="grid h-7 w-6 shrink-0 place-items-center rounded text-faint transition-colors hover:bg-high hover:text-bad"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
