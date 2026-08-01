import { useMemo } from 'react';
import { useSpawner } from '@/store/spawner';
import type { CatalogItem } from '@/types';

export function useItemMap(): Map<string, CatalogItem> {
  const items = useSpawner((s) => s.items);
  return useMemo(() => new Map(items.map((item) => [item.name, item])), [items]);
}
