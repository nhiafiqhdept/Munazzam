/**
 * Centralized API helper with safe JSON handling and resilient error messages.
 * Prevents "Unexpected token 'T', 'The page c'... is not valid JSON" errors
 * and guarantees proper user-facing error classification per specification:
 * - Wrong username/password -> "Invalid username or password"
 * - Server unavailable / 404 / Network failure -> "Unable to connect to server"
 * - Database/API 500 error -> "Unable to load account. Please try again."
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function safeApiFetch<T = any>(
  input: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, options);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let parsedData: any = null;
    let rawText: string | null = null;

    if (isJson) {
      try {
        parsedData = await res.json();
      } catch (parseError) {
        console.warn(`[safeApiFetch] Failed to parse JSON from ${input}:`, parseError);
      }
    } else {
      try {
        rawText = await res.text();
      } catch {}
    }

    if (!res.ok) {
      let errorMessage = 'Unable to connect to server';

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        // Credential or validation error
        errorMessage = parsedData?.error || 'Invalid username or password';
      } else if (res.status === 404) {
        // Endpoint not found or route missing
        errorMessage = 'Unable to connect to server';
      } else if (res.status >= 500) {
        // Internal server or database error
        errorMessage = parsedData?.error || 'Unable to load account. Please try again.';
      } else if (parsedData?.error) {
        errorMessage = parsedData.error;
      }

      return {
        ok: false,
        status: res.status,
        data: parsedData,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsedData as T,
      error: null,
    };
  } catch (err: any) {
    console.error(`[safeApiFetch] Network error for ${input}:`, err);
    // Network failure (offline, timeout, refused connection)
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Unable to connect to server',
    };
  }
}

export async function apiGet<T = any>(url: string, token?: string | null): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return safeApiFetch<T>(url, { method: 'GET', headers });
}

export async function apiPost<T = any>(
  url: string,
  body: any,
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return safeApiFetch<T>(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiPut<T = any>(
  url: string,
  body: any,
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return safeApiFetch<T>(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T = any>(
  url: string,
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return safeApiFetch<T>(url, {
    method: 'DELETE',
    headers,
  });
}
