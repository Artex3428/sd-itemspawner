import { useState } from 'react';
import { Play, Save, Trash2 } from 'lucide-react';
import { t } from '@/i18n';
import { useSpawner } from '@/store/spawner';
import type { Category } from '@/types';

const CATEGORIES: (Category | 'all')[] = ['all', 'weapons', 'ammo', 'components', 'usable', 'misc'];

export function FilterRail() {
  const counts = useSpawner((s) => s.counts);
  const total = useSpawner((s) => s.items.length);
  const category = useSpawner((s) => s.category);
  const setCategory = useSpawner((s) => s.setCategory);
  const presets = useSpawner((s) => s.presets);
  const savePreset = useSpawner((s) => s.savePreset);
  const deletePreset = useSpawner((s) => s.deletePreset);
  const spawnPreset = useSpawner((s) => s.spawnPreset);
  const loadPreset = useSpawner((s) => s.loadPreset);

  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const name = draft.trim();
    if (name) void savePreset(name);
    setDraft('');
    setNaming(false);
  };

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-line">
      <nav className="shrink-0 p-2">
        {CATEGORIES.map((key) => {
          const active = category === key;
          const count = key === 'all' ? total : (counts[key] ?? 0);

          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`group flex w-full items-center justify-between rounded-md px-2.5 py-1.5
                          text-left text-xs transition-colors ${
                            active ? 'bg-high text-ink' : 'text-muted hover:bg-raise hover:text-ink'
                          }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-3 w-0.5 rounded-full transition-colors ${
                    active ? 'bg-select' : 'bg-transparent group-hover:bg-edge'
                  }`}
                />
                {t.categories[key]}
              </span>
              <span className="font-mono text-2xs tabular-nums text-faint">{count}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-1 flex min-h-0 flex-1 flex-col border-t border-line">
        <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-3">
          <span className="text-2xs font-medium uppercase tracking-wider text-faint">{t.presets}</span>
          <button
            type="button"
            onClick={() => setNaming(true)}
            title={t.presetSave}
            className="grid h-5 w-5 place-items-center rounded text-faint transition-colors hover:bg-high hover:text-ink"
          >
            <Save className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        {naming && (
          <div className="px-2 pb-2">
            <input
              autoFocus
              value={draft}
              maxLength={48}
              placeholder={t.presetNamePrompt}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit();
                if (event.key === 'Escape') {
                  setDraft('');
                  setNaming(false);
                }
              }}
              className="h-7 w-full rounded border border-edge bg-raise px-2 text-2xs text-ink
                         placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-edge"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {presets.length === 0 ? (
            <p className="px-1 py-2 text-2xs leading-relaxed text-faint">{t.presetsEmpty}</p>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.name}
                className="group mb-1 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-line hover:bg-raise"
              >
                <button
                  type="button"
                  onClick={() => loadPreset(preset.name)}
                  title={t.presetLoad}
                  className="block w-full truncate text-left text-xs text-muted transition-colors group-hover:text-ink"
                >
                  {preset.name}
                </button>

                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-2xs text-faint">
                    {preset.rows.length} {preset.rows.length === 1 ? 'item' : 'items'}
                  </span>

                  <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void spawnPreset(preset.name)}
                      title={t.presetSpawnNow}
                      className="grid h-5 w-5 place-items-center rounded text-faint transition-colors hover:bg-high hover:text-ink"
                    >
                      <Play className="h-3 w-3" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePreset(preset.name)}
                      title={t.presetDelete}
                      className="grid h-5 w-5 place-items-center rounded text-faint transition-colors hover:bg-high hover:text-bad"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
