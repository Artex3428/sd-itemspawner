import { useEffect, useMemo } from 'react';
import { useNuiEvent } from '@/hooks/useNuiEvent';
import { filterItems } from '@/lib/search';
import { useSpawner } from '@/store/spawner';
import type { OpenPayload } from '@/types';
import { FilterRail } from '@/components/FilterRail';
import { Header } from '@/components/Header';
import { Inspector } from '@/components/Inspector';
import { ItemGrid } from '@/components/ItemGrid';
import { SelectionTray } from '@/components/SelectionTray';
import { TargetPicker } from '@/components/TargetPicker';
import { Toast } from '@/components/Toast';

export default function App() {
  const open = useSpawner((s) => s.open);
  const openPanel = useSpawner((s) => s.openPanel);
  const closePanel = useSpawner((s) => s.closePanel);
  const items = useSpawner((s) => s.items);
  const query = useSpawner((s) => s.query);
  const category = useSpawner((s) => s.category);

  useNuiEvent<OpenPayload>('spawner:open', openPanel);
  useNuiEvent('spawner:close', () => useSpawner.setState({ open: false }));

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  const visible = useMemo(() => filterItems(items, query, category), [items, query, category]);

  if (!open) return null;

  return (
    <div className="grid h-full w-full place-items-center">
      <div
        className="animate-panel-in relative flex h-[46rem] max-h-[92vh] w-[74rem] max-w-[95vw]
                   flex-col overflow-hidden rounded-lg border border-line bg-panel font-sans
                   text-ink shadow-panel"
      >
        <Header visible={visible.length} total={items.length} />

        <div className="flex min-h-0 flex-1">
          <FilterRail />
          <ItemGrid items={visible} />

          <div className="flex w-[22rem] shrink-0 flex-col border-l border-line">
            <Inspector />
            <SelectionTray />
            <TargetPicker />
          </div>
        </div>

        <Toast />
      </div>
    </div>
  );
}
