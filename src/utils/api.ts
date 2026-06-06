interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  signal?: AbortSignal
}

interface ApiResponse<T = any> {
  data: T | null
  error: string | null
  meta?: {
    requestId: string
    duration: number
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const startTime = Date.now()
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId
  }

  const headers = { ...defaultHeaders, ...options.headers }

  try {
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      return {
        data: null,
        error: `HTTP ${response.status}: ${errorText}`,
        meta: { requestId, duration }
      }
    }

    const contentType = response.headers.get('content-type')
    let data: T | null = null

    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else if (contentType?.includes('text/')) {
      data = (await response.text()) as unknown as T
    } else {
      data = (await response.blob()) as unknown as T
    }

    return {
      data,
      error: null,
      meta: { requestId, duration }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      data: null,
      error: errorMessage,
      meta: { requestId, duration }
    }
  }
}

export function createApiError(message: string, code?: string): Error {
  const error = new Error(message)
  if (code) {
    (error as any).code = code
  }
  return error
}

export function isApiError(error: any): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error
}
