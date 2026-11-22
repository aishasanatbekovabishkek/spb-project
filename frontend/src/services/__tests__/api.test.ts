
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  ApiError,
  apiRequest,
  hasAccessToken,
  setAccessToken,
} from '../api'

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

afterEach(() => {
  setAccessToken(null)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('API client', () => {
  it('не отправляет защищённый запрос без токена', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/applications', {
        requiresAuth: true,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('сохраняет и удаляет токен', () => {
    expect(hasAccessToken()).toBe(false)

    setAccessToken('test-token')
    expect(hasAccessToken()).toBe(true)

    setAccessToken(null)
    expect(hasAccessToken()).toBe(false)
  })

  it('передаёт Bearer-токен и JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 'application-1' }, 201),
    )

    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('test-jwt')

    const result = await apiRequest<{ id: string }>(
      '/applications',
      {
        method: 'POST',
        body: {
          source: 'trudvsem',
          external_id: '123',
        },
        requiresAuth: true,
      },
    )

    expect(result.id).toBe('application-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/applications',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          source: 'trudvsem',
          external_id: '123',
        }),
      }),
    )
  })

  it('обрабатывает успешное удаление 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, { status: 204 }),
      ),
    )

    await expect(
      apiRequest('/saved-vacancies/id', {
        method: 'DELETE',
      }),
    ).resolves.toBeNull()
  })

  it('распознаёт ошибку конфликта 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'VACANCY_ALREADY_SAVED',
              message: 'Вакансия уже сохранена',
            },
          },
          409,
        ),
      ),
    )

    await expect(
      apiRequest('/saved-vacancies'),
    ).rejects.toMatchObject({
      status: 409,
      code: 'VACANCY_ALREADY_SAVED',
      message: 'Вакансия уже сохранена',
    })
  })

  it('обрабатывает некорректный JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{invalid-json', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    )

    await expect(
      apiRequest('/statistics'),
    ).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })

  it('обрабатывает недоступность сети', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        new TypeError('Failed to fetch'),
      ),
    )

    await expect(
      apiRequest('/vacancies'),
    ).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })

  it('не скрывает отмену запроса', async () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(abortError),
    )

    await expect(
      apiRequest('/vacancies'),
    ).rejects.toBe(abortError)
  })

  it('использует специальный класс API-ошибок', () => {
    const error = new ApiError(
      401,
      'Нет доступа',
      'UNAUTHORIZED',
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
  })
})
