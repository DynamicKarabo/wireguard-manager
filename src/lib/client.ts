import { z } from 'zod';

export class FetchError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`HTTP ${status}: ${url}`);
    this.name = 'FetchError';
  }
}

export class SchemaError extends Error {
  constructor(
    public url: string,
    public zodError: z.ZodError,
  ) {
    super(`Schema validation failed for ${url}`);
    this.name = 'SchemaError';
  }
}

export async function fetchJson<T>(url: string, schema: z.ZodSchema<T>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal });
  if (!res.ok) throw new FetchError(res.status, url);
  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new SchemaError(url, parsed.error);
  return parsed.data;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]!}`;
}

export function formatHandshakeAge(seconds: number | null): string {
  if (seconds === null) return 'Never';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  return formatHandshakeAge(seconds);
}
