import { Globe, MapPin, RefreshCcw, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { useSpawner } from '@/store/spawner';
import type { TargetMode } from '@/types';

const MODES: { mode: TargetMode; label: string; icon: LucideIcon }[] = [
  { mode: 'self', label: t.targetSelf, icon: User },
  { mode: 'player', label: t.targetPlayer, icon: Users },
  { mode: 'nearby', label: t.targetNearby, icon: MapPin },
  { mode: 'all', label: t.targetAll, icon: Globe },
];

export function TargetPicker() {
  const target = useSpawner((s) => s.target);
  const players = useSpawner((s) => s.players);
  const limits = useSpawner((s) => s.limits);
  const order = useSpawner((s) => s.order);
  const busy = useSpawner((s) => s.busy);
  const setTarget = useSpawner((s) => s.setTarget);
  const refreshPlayers = useSpawner((s) => s.refreshPlayers);
  const spawn = useSpawner((s) => s.spawn);

  const broadcasting = target.mode === 'all';
  const needsPlayer = target.mode === 'player' && target.playerId === undefined;
  const blocked = busy || order.length === 0 || needsPlayer;

  return (
    <section className="shrink-0 border-t border-line p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-wider text-faint">{t.target}</span>
        {target.mode === 'player' && (
          <button
            type="button"
            onClick={() => void refreshPlayers()}
            title={t.targetRefresh}
            className="grid h-5 w-5 place-items-center rounded text-faint transition-colors hover:bg-high hover:text-ink"
          >
            <RefreshCcw className="h-3 w-3" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1">
        {MODES.map(({ mode, label, icon: Icon }) => {
          const active = target.mode === mode;
          const activeTone =
            mode === 'all' ? 'border-warn/50 bg-warn/10 text-warn' : 'border-select/40 bg-high text-ink';

          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTarget({ mode, playerId: mode === 'player' ? target.playerId : undefined })}
              className={`flex flex-col items-center gap-1 rounded-md border py-2 text-2xs transition-colors ${
                active ? activeTone : 'border-line bg-raise text-faint hover:border-edge hover:text-muted'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </div>

      {target.mode === 'player' && (
        <select
          value={target.playerId ?? ''}
          onChange={(event) =>
            setTarget({
              mode: 'player',
              playerId: event.target.value === '' ? undefined : Number(event.target.value),
            })
          }
          className="mt-1.5 h-8 w-full rounded-md border border-line bg-raise px-2 text-2xs text-ink
                     focus:border-edge focus:outline-none"
        >
          <option value="">{t.targetPickPlayer}</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              [{player.id}] {player.name}
            </option>
          ))}
        </select>
      )}

      {target.mode === 'nearby' && (
        <p className="mt-1.5 text-2xs text-faint">
          Everyone within {limits.nearbyRadius}m of you.
        </p>
      )}

      {broadcasting && (
        <p className="mt-1.5 text-2xs text-warn/90">
          This delivers to every connected player.
        </p>
      )}

      <button
        type="button"
        disabled={blocked}
        onClick={() => void spawn()}
        className={`mt-2 h-10 w-full rounded-md border text-xs font-medium transition-colors ${
          blocked
            ? 'cursor-not-allowed border-line bg-raise text-faint'
            : broadcasting
              ? 'border-warn/60 bg-warn/15 text-warn hover:bg-warn/25'
              : 'border-edge bg-high text-ink hover:border-select/50 hover:bg-select/10'
        }`}
      >
        {busy ? t.spawning : t.spawn}
      </button>
    </section>
  );
}
