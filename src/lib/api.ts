export function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // An empty value uses the same-origin API, suitable for reverse-proxy setups.
  return '';
}

export function normalizeProductId(productId: string | number | null | undefined): number | null {
  if (productId === null || productId === undefined || productId === '') {
    return null;
  }

  const text = String(productId).trim();
  if (!text) {
    return null;
  }

  if (/^\d+$/.test(text)) {
    const value = Number(text);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  return null;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
  });
}
