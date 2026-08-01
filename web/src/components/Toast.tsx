import { useEffect } from 'react';
import { Check, Info, X } from 'lucide-react';
import { useSpawner } from '@/store/spawner';
import type { ToastTone } from '@/types';

const TONES: Record<ToastTone, { icon: typeof Check; ring: string; text: string }> = {
  good: { icon: Check, ring: 'border-good/40', text: 'text-good' },
  warn: { icon: Info, ring: 'border-warn/40', text: 'text-warn' },
  bad: { icon: X, ring: 'border-bad/40', text: 'text-bad' },
};

export function Toast() {
  const toast = useSpawner((s) => s.toast);
  const dismiss = useSpawner((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  const tone = TONES[toast.tone];
  const Icon = tone.icon;

  return (
    <div className="animate-toast-in pointer-events-auto absolute bottom-4 left-1/2 z-10 w-[26rem] -translate-x-1/2">
      <div className={`flex items-start gap-2.5 rounded-md border ${tone.ring} bg-raise px-3 py-2.5 shadow-lift`}>
        <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone.text}`} strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <div className="text-2xs font-medium text-ink">{toast.title}</div>
          {toast.detail && (
            <div className="mt-0.5 break-words text-2xs leading-relaxed text-muted">{toast.detail}</div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="grid h-4 w-4 shrink-0 place-items-center rounded text-faint transition-colors hover:bg-high hover:text-ink"
        >
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
