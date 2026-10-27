
const API_BASE_URL = '/api/v1'

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, message: string, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  requiresAuth?: boolean
}

type ErrorData = {
  error?: {
    code?: string
    message?: string
  }
  detail?: string | unknown[]
  message?: string
}

function parseError(data: unknown): {
  message: string
  code: string
} {
  if (typeof data === 'object' && data !== null) {
    const value = data as ErrorData

    if (value.error?.message) {
      return {
        message: value.error.message,
        code: value.error.code ?? 'API_ERROR',
      }
    }

    if (typeof value.detail === 'string') {
      return {
        message: value.detail,
        code: 'API_ERROR',
      }
    }

    if (Array.isArray(value.detail)) {
      return {
        message: 'Проверьте правильность введённых данных.',
        code: 'VALIDATION_ERROR',
      }
    }

    if (value.message) {
      return {
        message: value.message,
        code: 'API_ERROR',
      }
    }
  }

  return {
    message: 'Не удалось выполнить запрос.',
    code: 'API_ERROR',
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    signal,
    requiresAuth = false,
  } = options

  if (requiresAuth && !accessToken) {
    throw new ApiError(
      401,
      'Необходимо войти в аккаунт.',
      'UNAUTHORIZED',
    )
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (requiresAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }

    throw new ApiError(
      0,
      'Не удалось связаться с сервером.',
      'NETWORK_ERROR',
    )
  }

  let data: unknown = null

  if (response.status !== 204) {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch {
        throw new ApiError(
          response.status,
          'Сервер вернул некорректный JSON.',
          'INVALID_RESPONSE',
        )
      }
    }
  }

  if (!response.ok) {
    const error = parseError(data)

    throw new ApiError(
      response.status,
      error.message,
      error.code,
    )
  }

  return data as T
}
