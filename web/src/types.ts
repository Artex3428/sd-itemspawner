export type Category = 'weapons' | 'ammo' | 'components' | 'usable' | 'misc';

export interface CatalogItem {
  name: string;
  label: string;
  weight: number;
  stack: boolean;
  close: boolean;
  description?: string;
  degrade?: number;
  category: Category;
  image: string;
  usable?: boolean;
  ammoname?: string;
}

export type MetaValue = string | number | boolean;

export interface SelectionRow {
  name: string;
  count: number;
  metadata: Record<string, MetaValue>;
}

export interface PlayerRef {
  id: number;
  name: string;
}

export interface PresetRow {
  name: string;
  label: string;
  count: number;
  metadata?: Record<string, MetaValue>;
}

export interface Preset {
  name: string;
  rows: PresetRow[];
}

export type TargetMode = 'self' | 'player' | 'all' | 'nearby';

export interface Target {
  mode: TargetMode;
  playerId?: number;
}

export interface Limits {
  maxCount: number;
  maxSelection: number;
  nearbyRadius: number;
}

export interface OpenPayload {
  items: CatalogItem[];
  counts: Partial<Record<Category, number>>;
  imagePath: string;
  presets: Preset[];
  players: PlayerRef[];
  self: PlayerRef;
  limits: Limits;
}

export interface GiveFailure {
  playerId: number;
  playerName: string;
  item: string;
  reason: string;
}

export interface ServerResult {
  ok: boolean;
  error?: string;
  message?: string;
  delivered?: number;
  recipients?: number;
  failures?: GiveFailure[];
  presets?: Preset[];
  players?: PlayerRef[];
}

export type ToastTone = 'good' | 'bad' | 'warn';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}
