/**
 * API client for the CNN TEAM Dashboard.
 * 
 * SECURITY: All data access goes through the FastAPI backend.
 * No Supabase keys are exposed in the frontend.
 */

// Backend API base URL (FastAPI)
export const API_BASE = import.meta.env.VITE_API_URL || '/api'

/**
 * Generic fetch helper for the FastAPI backend.
 * All data operations go through the backend — no direct Supabase access.
 */
export async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}
