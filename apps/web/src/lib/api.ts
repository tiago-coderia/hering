const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errJson: any = {};
    try {
      errJson = await response.json();
    } catch {
      // Ignora erro de parse
    }
    throw new ApiError(
      errJson.message || `Erro na requisição (${response.status})`,
      response.status,
      errJson.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

