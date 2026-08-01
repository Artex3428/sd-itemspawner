import type { CatalogItem, Category, OpenPayload } from '@/types';

const WEAPONS = ['Pistol', 'Combat Pistol', 'AP Pistol', 'Heavy Pistol', 'Vintage Pistol', 'Micro SMG', 'SMG', 'Assault SMG', 'Carbine Rifle', 'Assault Rifle', 'Bullpup Rifle', 'Pump Shotgun', 'Sawn-off Shotgun', 'Sniper Rifle', 'Heavy Sniper', 'Marksman Rifle'];
const AMMO = ['Pistol Ammo', 'SMG Ammo', 'Rifle Ammo', 'Shotgun Shells', 'Sniper Rounds'];
const COMPONENTS = ['Pistol Clip', 'Pistol EXT Clip', 'Pistol Flashlight', 'Pistol Suppressor', 'SMG Clip', 'SMG Drum', 'SMG EXT Clip', 'Rifle Grip', 'Scope', 'Advanced Scope'];
const USABLE = ['Bandage', 'Medikit', 'Water Bottle', 'Sandwich', 'Coffee', 'Energy Drink', 'Lockpick', 'Advanced Lockpick', 'Repair Kit', 'Radio', 'Phone', 'Binoculars'];
const MISC = ['Gold Bar', 'Rolex', 'Diamond Ring', 'Scrap Metal', 'Copper', 'Steel', 'Rubber', 'Plastic', 'Glass', 'Aluminium', 'Cash Roll', 'Marked Bills'];

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function make(label: string, category: Category, index: number): CatalogItem {
  const isWeapon = category === 'weapons';

  return {
    name: isWeapon ? `WEAPON_${slug(label).toUpperCase()}` : slug(label),
    label,
    weight: isWeapon ? 1200 + index * 40 : 10 + index * 15,
    stack: !isWeapon,
    close: true,
    description: index % 3 === 0 ? `A ${label.toLowerCase()} in serviceable condition.` : undefined,
    degrade: category === 'usable' && index % 4 === 0 ? 4320 : undefined,
    category,
    image: `${slug(label)}.png`,
    usable: category === 'usable' || undefined,
    ammoname: isWeapon ? 'ammo-9' : undefined,
  };
}

function buildItems(): CatalogItem[] {
  const groups: [string[], Category][] = [
    [WEAPONS, 'weapons'],
    [AMMO, 'ammo'],
    [COMPONENTS, 'components'],
    [USABLE, 'usable'],
    [MISC, 'misc'],
  ];

  const items: CatalogItem[] = [];

  for (const [labels, category] of groups) {
    for (let pass = 0; pass < 8; pass += 1) {
      labels.forEach((label, index) => {
        const suffixed = pass === 0 ? label : `${label} Mk${pass + 1}`;
        items.push(make(suffixed, category, index + pass));
      });
    }
  }

  return items.sort((a, b) => a.label.localeCompare(b.label));
}

export function devSeed(): void {
  const items = buildItems();
  const counts: Partial<Record<Category, number>> = {};

  for (const item of items) {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
  }

  const payload: OpenPayload = {
    items,
    counts,
    imagePath: 'nui://ox_inventory/web/images/',
    presets: [
      {
        name: 'Patrol kit',
        rows: [
          { name: 'bandage', label: 'Bandage', count: 5 },
          { name: 'radio', label: 'Radio', count: 1 },
          { name: 'WEAPON_PISTOL', label: 'Pistol', count: 1, metadata: { serial: 'ABC123' } },
        ],
      },
      { name: 'Crafting stock', rows: [{ name: 'steel', label: 'Steel', count: 200 }] },
    ],
    players: [
      { id: 1, name: 'Sam' },
      { id: 4, name: 'Riley Bennett' },
      { id: 12, name: 'J. Okafor' },
      { id: 27, name: 'mia_' },
    ],
    self: { id: 1, name: 'Sam' },
    limits: { maxCount: 500, maxSelection: 64, nearbyRadius: 20 },
  };

  document.body.style.background = '#20232a';

  setTimeout(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { action: 'spawner:open', data: payload } }));
  }, 150);
}
