import type { CatalogItem, Category } from '@/types';

export function filterItems(
  items: CatalogItem[],
  query: string,
  category: Category | 'all',
): CatalogItem[] {
  const pool = category === 'all' ? items : items.filter((item) => item.category === category);

  const needle = query.trim().toLowerCase();
  if (!needle) return pool;

  const terms = needle.split(/\s+/);
  const scored: { item: CatalogItem; score: number }[] = [];

  for (const item of pool) {
    const label = item.label.toLowerCase();
    const name = item.name.toLowerCase();

    if (!terms.every((term) => label.includes(term) || name.includes(term))) continue;

    let score = 3;
    if (name === needle || label === needle) score = 0;
    else if (name.startsWith(needle) || label.startsWith(needle)) score = 1;
    else if (label.includes(needle)) score = 2;

    scored.push({ item, score });
  }

  scored.sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label));

  return scored.map((entry) => entry.item);
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2)} kg`;
  return `${grams} g`;
}
