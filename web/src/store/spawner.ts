import { create } from 'zustand';
import { asArray, callServer, fetchNui } from '@/nui/bridge';
import type {
  CatalogItem,
  Category,
  Limits,
  MetaValue,
  OpenPayload,
  PlayerRef,
  Preset,
  SelectionRow,
  ServerResult,
  Target,
  Toast,
  ToastTone,
} from '@/types';

const DEFAULT_LIMITS: Limits = { maxCount: 500, maxSelection: 64, nearbyRadius: 20 };

let toastId = 0;

interface SpawnerState {
  open: boolean;
  items: CatalogItem[];
  counts: Partial<Record<Category, number>>;
  imagePath: string;
  presets: Preset[];
  players: PlayerRef[];
  self: PlayerRef | null;
  limits: Limits;

  query: string;
  category: Category | 'all';
  showInfo: boolean;
  selection: Record<string, SelectionRow>;
  order: string[];
  focused: string | null;
  target: Target;
  busy: boolean;
  toast: Toast | null;

  openPanel: (payload: OpenPayload) => void;
  closePanel: () => void;
  setQuery: (query: string) => void;
  setCategory: (category: Category | 'all') => void;
  toggleInfo: () => void;
  focus: (name: string | null) => void;
  toggle: (item: CatalogItem) => void;
  setCount: (name: string, count: number) => void;
  setMeta: (name: string, metadata: Record<string, MetaValue>) => void;
  clearSelection: () => void;
  setTarget: (target: Target) => void;
  refreshPlayers: () => Promise<void>;
  spawn: () => Promise<void>;
  savePreset: (name: string) => Promise<void>;
  deletePreset: (name: string) => Promise<void>;
  spawnPreset: (name: string) => Promise<void>;
  loadPreset: (name: string) => void;
  pushToast: (tone: ToastTone, title: string, detail?: string) => void;
  dismissToast: () => void;
}

function describeSpawn(result: ServerResult): { tone: ToastTone; title: string; detail?: string } {
  const failures = asArray(result.failures);
  const delivered = result.delivered ?? 0;

  if (failures.length === 0) {
    return {
      tone: 'good',
      title: `Delivered ${delivered} ${delivered === 1 ? 'stack' : 'stacks'}`,
      detail: `to ${result.recipients ?? 0} ${result.recipients === 1 ? 'player' : 'players'}`,
    };
  }

  const sample = failures
    .slice(0, 3)
    .map((f) => `${f.playerName}: ${f.item} (${f.reason})`)
    .join(' · ');

  return {
    tone: delivered > 0 ? 'warn' : 'bad',
    title:
      delivered > 0
        ? `Delivered ${delivered}, ${failures.length} failed`
        : `All ${failures.length} deliveries failed`,
    detail: failures.length > 3 ? `${sample} · and ${failures.length - 3} more` : sample,
  };
}

export const useSpawner = create<SpawnerState>((set, get) => ({
  open: false,
  items: [],
  counts: {},
  imagePath: '',
  presets: [],
  players: [],
  self: null,
  limits: DEFAULT_LIMITS,

  query: '',
  category: 'all',
  showInfo: false,
  selection: {},
  order: [],
  focused: null,
  target: { mode: 'self' },
  busy: false,
  toast: null,

  openPanel: (payload) =>
    set({
      open: true,
      items: asArray(payload.items),
      counts: payload.counts ?? {},
      imagePath: payload.imagePath ?? '',
      presets: asArray(payload.presets),
      players: asArray(payload.players),
      self: payload.self ?? null,
      limits: payload.limits ?? DEFAULT_LIMITS,
      query: '',
      category: 'all',
      selection: {},
      order: [],
      focused: null,
      target: { mode: 'self' },
      busy: false,
      toast: null,
    }),

  closePanel: () => {
    set({ open: false });
    void fetchNui('spawner:close');
  },

  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  toggleInfo: () => set((s) => ({ showInfo: !s.showInfo })),
  focus: (focused) => set({ focused }),

  toggle: (item) => {
    const s = get();

    if (s.selection[item.name]) {
      const selection = { ...s.selection };
      delete selection[item.name];
      set({ selection, order: s.order.filter((n) => n !== item.name), focused: item.name });
      return;
    }

    if (s.order.length >= s.limits.maxSelection) {
      s.pushToast('warn', 'Selection full', `The server caps a spawn at ${s.limits.maxSelection} items.`);
      return;
    }

    set({
      selection: { ...s.selection, [item.name]: { name: item.name, count: 1, metadata: {} } },
      order: [...s.order, item.name],
      focused: item.name,
    });
  },

  setCount: (name, count) =>
    set((s) => {
      const row = s.selection[name];
      if (!row) return {};

      const clamped = Math.max(1, Math.min(s.limits.maxCount, Math.floor(count) || 1));
      return { selection: { ...s.selection, [name]: { ...row, count: clamped } } };
    }),

  setMeta: (name, metadata) =>
    set((s) => {
      const row = s.selection[name];
      if (!row) return {};
      return { selection: { ...s.selection, [name]: { ...row, metadata } } };
    }),

  clearSelection: () => set({ selection: {}, order: [], focused: null }),
  setTarget: (target) => set({ target }),

  refreshPlayers: async () => {
    const result = await callServer('spawner:players');
    if (result.ok) set({ players: asArray(result.players) });
  },

  spawn: async () => {
    const { order, selection, target, busy } = get();
    if (busy) return;

    if (order.length === 0) {
      get().pushToast('warn', 'Nothing selected', 'Pick at least one item first.');
      return;
    }

    if (target.mode === 'player' && target.playerId === undefined) {
      get().pushToast('warn', 'No recipient', 'Choose which player receives this.');
      return;
    }

    set({ busy: true });

    const rows = order.map((name) => {
      const row = selection[name];
      return {
        name: row.name,
        count: row.count,
        metadata: Object.keys(row.metadata).length > 0 ? row.metadata : undefined,
      };
    });

    const result = await callServer('spawner:give', { rows, target });
    set({ busy: false });

    if (!result.ok) {
      get().pushToast('bad', 'Spawn refused', result.message);
      return;
    }

    const { tone, title, detail } = describeSpawn(result);
    get().pushToast(tone, title, detail);
  },

  savePreset: async (name) => {
    const { order, selection } = get();

    if (order.length === 0) {
      get().pushToast('warn', 'Nothing to save', 'Select some items first.');
      return;
    }

    const rows = order.map((key) => {
      const row = selection[key];
      return {
        name: row.name,
        count: row.count,
        metadata: Object.keys(row.metadata).length > 0 ? row.metadata : undefined,
      };
    });

    const result = await callServer('spawner:presetSave', { name, rows });

    if (!result.ok) {
      get().pushToast('bad', 'Could not save preset', result.message);
      return;
    }

    set({ presets: asArray(result.presets) });
    get().pushToast('good', 'Preset saved', name);
  },

  deletePreset: async (name) => {
    const result = await callServer('spawner:presetDelete', { name });

    if (!result.ok) {
      get().pushToast('bad', 'Could not delete preset', result.message);
      return;
    }

    set({ presets: asArray(result.presets) });
  },

  spawnPreset: async (name) => {
    const { target, busy } = get();
    if (busy) return;

    if (target.mode === 'player' && target.playerId === undefined) {
      get().pushToast('warn', 'No recipient', 'Choose which player receives this.');
      return;
    }

    set({ busy: true });
    const result = await callServer('spawner:presetSpawn', { name, target });
    set({ busy: false });

    if (!result.ok) {
      get().pushToast('bad', 'Spawn refused', result.message);
      return;
    }

    const described = describeSpawn(result);
    get().pushToast(described.tone, described.title, described.detail);
  },

  loadPreset: (name) =>
    set((s) => {
      const preset = s.presets.find((p) => p.name === name);
      if (!preset) return {};

      const selection: Record<string, SelectionRow> = {};
      const order: string[] = [];

      for (const row of asArray(preset.rows)) {
        selection[row.name] = { name: row.name, count: row.count, metadata: row.metadata ?? {} };
        order.push(row.name);
      }

      return { selection, order, focused: order[0] ?? null };
    }),

  pushToast: (tone, title, detail) => set({ toast: { id: ++toastId, tone, title, detail } }),
  dismissToast: () => set({ toast: null }),
}));
