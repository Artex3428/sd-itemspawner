export const t = {
  title: 'Item Spawner',
  subtitle: 'ox_inventory',
  searchPlaceholder: 'Search items, or paste an item name…',
  showInfo: 'Item details',

  categories: {
    all: 'All items',
    weapons: 'Weapons',
    ammo: 'Ammo',
    components: 'Attachments',
    usable: 'Usable',
    misc: 'Misc',
  },

  presets: 'Loadouts',
  presetsEmpty: 'No saved loadouts yet.',
  presetSave: 'Save selection',
  presetNamePrompt: 'Name this loadout',
  presetLoad: 'Load into tray',
  presetSpawnNow: 'Spawn now',
  presetDelete: 'Delete',

  inspectorEmpty: 'Select an item to inspect it.',
  inspectorHint: 'Click a card to add it. Click again to remove.',

  amount: 'Amount',
  metadata: 'Metadata',
  metadataHint: 'Leave empty to let ox_inventory generate defaults (serials, durability).',
  metadataAdd: 'Add field',
  metadataKey: 'key',
  metadataValue: 'value',

  weight: 'Weight',
  stacks: 'Stacks',
  closes: 'Closes UI',
  degrades: 'Degrades',
  usesAmmo: 'Ammo',
  yes: 'Yes',
  no: 'No',

  selection: 'Selection',
  selectionEmpty: 'Nothing staged.',
  clear: 'Clear',

  target: 'Deliver to',
  targetSelf: 'Myself',
  targetPlayer: 'Player',
  targetNearby: 'Nearby',
  targetAll: 'Everyone',
  targetPickPlayer: 'Choose a player…',
  targetRefresh: 'Refresh player list',

  spawn: 'Spawn',
  spawning: 'Spawning…',

  noResults: 'No items match that search.',
  noResultsHint: 'Try a shorter term, or switch category.',
} as const;
