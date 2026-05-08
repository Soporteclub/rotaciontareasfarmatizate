// API helper functions for data fetching

/** Fetch wrapper that unwraps `{ data: T }` responses */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(error.error || `Error ${res.status}`);
  }

  const json = await res.json();
  return json.data as T;
}

/** Fetch wrapper that returns the full JSON response (for endpoints that don't wrap in { data }) */
export async function rawFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(error.error || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
