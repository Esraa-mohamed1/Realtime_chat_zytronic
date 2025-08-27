export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = token ? { ...init?.headers, Authorization: `Bearer ${token}` } : init?.headers;
  
  const res = await fetch(`${API_BASE_URL}${path}`, { 
    ...init, 
    headers,
    cache: 'no-store' 
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, data: any, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...init?.headers,
    ...(token && { Authorization: `Bearer ${token}` })
  };
  
  console.log(`Making POST request to ${API_BASE_URL}${path}`);
  console.log('Request data:', data);
  
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...init
    });
    
    console.log(`Response status: ${res.status}`);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('API error response:', errorData);
      throw new Error(errorData.error || `POST ${path} failed: ${res.status}`);
    }
    
    const responseData = await res.json();
    console.log('API response data:', responseData);
    return responseData;
  } catch (error) {
    console.error(`API error for ${path}:`, error);
    throw error;
  }
}