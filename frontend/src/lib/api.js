export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function apiGet(path, init = {}) {
  const token = localStorage.getItem('token');
  const headers = token ? { ...init.headers, Authorization: `Bearer ${token}` } : init.headers;
  
  const res = await fetch(`${API_BASE_URL}${path}`, { 
    ...init, 
    headers,
    cache: 'no-store' 
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path, data, init = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...init.headers,
    ...(token && { Authorization: `Bearer ${token}` })
  };
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    ...init
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `POST ${path} failed: ${res.status}`);
  }
  
  return res.json();
}
