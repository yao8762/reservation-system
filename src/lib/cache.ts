import { unstable_cache } from 'next/cache';

// ─── Supabase fetch helper ────────────────────────────────────────────────
const SUPABASE_URL = 'https://msfnakrwhggvbrotvbfq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lOy6FWvc2E0I4IGDkv8f8g_2hUn-eOd';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function supabaseGet<T = any>(path: string): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, { headers, next: { revalidate: 300 } } as any);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [data].filter(Boolean);
}

// ─── In-memory LRU cache (Node.js process-level) ─────────────────────────
// 簡單的 Map + TTL，存活在 Next.js server process 內
interface CacheEntry<T> {
  data: T;
  expires: number; // ms timestamp
}

const memoryCache = new Map<string, CacheEntry<any>>();
const MEMORY_TTL_MS = 60_000; // 60 秒記憶體快取

export function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setToMemory<T>(key: string, data: T, ttlMs = MEMORY_TTL_MS): void {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs });
}

// ─── Stable cache tags (Next.js Data Cache) ──────────────────────────────
// unstable_cache 的 key 是 auto-generated from args, tags are for revalidation

export const getTechniciansCached = unstable_cache(
  async () => {
    return supabaseGet<{
      id: string; name: string; nickname: string;
      specialty: string; photo_url?: string;
    }>('technicians?order=nickname.asc');
  },
  ['technicians'],
  { revalidate: 300, tags: ['technicians'] }
);

export const getServicesCached = unstable_cache(
  async () => {
    return supabaseGet<{
      id: string; name: string;
      duration_minutes: number; price: number;
    }>('services?order=price.asc');
  },
  ['services'],
  { revalidate: 300, tags: ['services'] }
);

// ─── Convenience: get technicians + services in one call (paired TTL) ────
export async function getTechniciansAndServicesCached() {
  const cacheKey = 'tech-and-services';

  // 1. Try in-memory (fastest, survives within same request)
  const mem = getFromMemory(cacheKey);
  if (mem) return mem as { technicians: any[]; services: any[] };

  // 2. Fall through to Next.js unstable_cache (shared across requests)
  const [technicians, services] = await Promise.all([
    getTechniciansCached(),
    getServicesCached(),
  ]);

  const result = { technicians, services };
  setToMemory(cacheKey, result, 60_000); // 60s in-memory

  return result;
}
