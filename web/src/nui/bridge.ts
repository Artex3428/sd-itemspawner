import type { ServerResult } from '@/types';

declare global {
  interface Window {
    GetParentResourceName?: () => string;
  }
}

export const isEnvBrowser = (): boolean => typeof window.GetParentResourceName !== 'function';

const resourceName = (): string => window.GetParentResourceName?.() ?? 'sd-itemspawner';

export async function fetchNui<Resp = unknown, Req = unknown>(
  callback: string,
  data?: Req,
): Promise<Resp | null> {
  if (isEnvBrowser()) return null;

  try {
    const resp = await fetch(`https://${resourceName()}/${callback}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data ?? {}),
    });
    return (await resp.json()) as Resp;
  } catch {
    return null;
  }
}

export async function callServer<Req = unknown>(
  callback: string,
  data?: Req,
): Promise<ServerResult> {
  const result = await fetchNui<ServerResult, Req>(callback, data);

  if (!result || typeof result !== 'object') {
    return { ok: false, message: 'No response from the server.' };
  }

  return result;
}

export function asArray<T>(value: T[] | undefined | null | Record<string, never>): T[] {
  return Array.isArray(value) ? value : [];
}
