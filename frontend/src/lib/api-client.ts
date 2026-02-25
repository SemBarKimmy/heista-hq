const DEFAULT_API_URL = 'https://api-dev.heista.danuseta.my.id'

function normalizeBaseUrl(url?: string) {
  const value = (url || DEFAULT_API_URL).trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL)

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const parsed = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const message =
      (parsed as { error?: string; message?: string } | null)?.error ||
      (parsed as { error?: string; message?: string } | null)?.message ||
      `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, parsed)
  }

  return parsed as T
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
