export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // 1. Se estiver no domínio de produção coderia.dev
    if (hostname.includes('coderia.dev')) {
      return 'https://api.coderia.dev/api/v1';
    }

    // 2. Se estiver acessando via Dev Tunnels do VS Code (ex: xxx-3000.brs.devtunnels.ms)
    const origin = window.location.origin;
    if (origin.includes('-3000.')) {
      return origin.replace('-3000.', '-3001.') + '/api/v1';
    }
  }

  // 3. Padrão configurado ou fallback local
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
}

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

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
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

