const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');
const GET_CACHE_MS = 15000;
const getCache = new Map();
const pendingGets = new Map();
let cacheVersion = 0;

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Could not reach the backend at ${API_BASE_URL}. Check that the API server is running.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  get: (path) => {
    // Health checks must always reach Express so the header reflects current connectivity.
    if (path === '/api/health') return apiRequest(path);
    const cached = getCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
    if (pendingGets.has(path)) return pendingGets.get(path);

    const requestVersion = cacheVersion;
    const request = apiRequest(path)
      .then((data) => {
        if (requestVersion === cacheVersion) getCache.set(path, { data, expiresAt: Date.now() + GET_CACHE_MS });
        return data;
      })
      .finally(() => {
        if (pendingGets.get(path) === request) pendingGets.delete(path);
      });
    pendingGets.set(path, request);
    return request;
  },
  post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }).then((data) => { cacheVersion += 1; getCache.clear(); pendingGets.clear(); return data; }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }).then((data) => { cacheVersion += 1; getCache.clear(); pendingGets.clear(); return data; }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }).then((data) => { cacheVersion += 1; getCache.clear(); pendingGets.clear(); return data; }),
};
