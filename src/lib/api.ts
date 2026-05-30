import { SUPABASE_URL, SUPABASE_KEY } from './supabase'

export interface ApiFetchOptions {
  method?: string
  body?: unknown
  extraHeaders?: Record<string, string>
  prefer?: string
  /** Override the API key (e.g. for API routes using SUPABASE_SERVICE_ROLE_KEY) */
  keyOverride?: string
  /** Override the full URL base */
  urlOverride?: string
}

/**
 * Unified fetch helper for Supabase REST API.
 *
 * - Prefixes relative paths with `${SUPABASE_URL}/rest/v1/`
 * - Adds apikey + Authorization + Content-Type headers
 * - Throws `ApiFetchError` on non-2xx responses
 * - Returns parsed JSON (or `undefined` for 204 No Content)
 *
 * Works on both server and client (SUPABASE_KEY is from NEXT_PUBLIC_ env var).
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, extraHeaders, prefer, keyOverride, urlOverride } = options

  const key = keyOverride || SUPABASE_KEY

  // Prefix relative paths; leave absolute URLs as-is
  const url = path.startsWith('http')
    ? path
    : `${urlOverride || SUPABASE_URL}/rest/v1/${path.startsWith('/') ? path.slice(1) : path}`

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extraHeaders,
  }
  if (body) headers['Content-Type'] = 'application/json'
  if (prefer) headers['Prefer'] = prefer

  const fetchOptions: RequestInit & { next?: Record<string, any> } = {
    method,
    headers,
  }
  if (body) fetchOptions.body = JSON.stringify(body)

  // Server-side GET caching hint
  if (typeof window === 'undefined' && method === 'GET') {
    fetchOptions.next = { revalidate: 300 }
  }

  const res = await fetch(url, fetchOptions as RequestInit)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiFetchError(res.status, res.statusText, text)
  }

  // 204 No Content (DELETE, etc.)
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export class ApiFetchError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`API Error ${status}: ${statusText}`)
    this.name = 'ApiFetchError'
  }
}

/**
 * Convenience: fetch all rows from a table with optional query string.
 * Returns empty array instead of throwing on error.
 */
export async function apiFetchAllSafe<T = any>(
  table: string,
  query = '',
  options: ApiFetchOptions = {},
): Promise<T[]> {
  try {
    const qs = query ? (query.startsWith('?') ? query : `?${query}`) : ''
    const data = await apiFetch<T[]>(`${table}${qs}`, options)
    return Array.isArray(data) ? data : [data].filter(Boolean)
  } catch (e) {
    console.error(`[apiFetchAllSafe] ${table}${query}:`, e)
    return []
  }
}
