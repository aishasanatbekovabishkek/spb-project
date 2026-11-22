
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { apiRequest } from '../api'

import {
  getApplications,
  createApplication,
  updateApplicationStatus,
  getApplicationHistory,
  getApplication,
} from '../applications'

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
}))

const mockedRequest = vi.mocked(apiRequest)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Applications service', () => {
  it('запрашивает список откликов', async () => {
    mockedRequest.mockResolvedValue({
      items: [],
      page: 1,
      per_page: 20,
      total: 0,
    })

    await getApplications()

    expect(mockedRequest).toHaveBeenCalledWith(
      '/applications?page=1&per_page=20',
      { requiresAuth: true },
    )
  })

  it('фильтрует отклики по статусу', async () => {
    mockedRequest.mockResolvedValue({
      items: [],
      page: 2,
      per_page: 10,
      total: 0,
    })

    await getApplications(2, 10, 'offer')

    expect(mockedRequest).toHaveBeenCalledWith(
      '/applications?page=2&per_page=10&status=offer',
      { requiresAuth: true },
    )
  })

  it('создаёт отклик на вакансию', async () => {
    const vacancy = {
      source: 'trudvsem',
      external_id: '987',
    }

    const application = {
      id: 'app-1',
      vacancy_id: 'vacancy-1',
      status: 'applied',
      created_at: '2026-11-22T12:00:00Z',
      updated_at: '2026-11-22T12:00:00Z',
    }

    mockedRequest.mockResolvedValue(application)

    const result = await createApplication(vacancy)

    expect(result).toEqual(application)

    expect(mockedRequest).toHaveBeenCalledWith(
      '/applications',
      {
        method: 'POST',
        body: vacancy,
        requiresAuth: true,
      },
    )
  })

  it('изменяет статус отклика на offer', async () => {
    const updated = {
      id: 'app-1',
      status: 'offer',
      updated_at: '2026-11-22T13:00:00Z',
    }

    mockedRequest.mockResolvedValue(updated)

    const result = await updateApplicationStatus(
      'app-1',
      'offer',
    )

    expect(result.status).toBe('offer')

    expect(mockedRequest).toHaveBeenCalledWith(
      '/applications/app-1/status',
      {
        method: 'PATCH',
        body: { status: 'offer' },
        requiresAuth: true,
      },
    )
  })

  it('запрашивает историю изменения статусов', async () => {
    const history = {
      items: [
        {
          id: 'history-1',
          old_status: null,
          new_status: 'applied',
          changed_at: '2026-11-22T12:00:00Z',
        },
        {
          id: 'history-2',
          old_status: 'applied',
          new_status: 'offer',
          changed_at: '2026-11-22T13:00:00Z',
        },
      ],
    }

    mockedRequest.mockResolvedValue(history)

    const result = await getApplicationHistory('app-1')

    expect(result.items).toHaveLength(2)
    expect(result.items[1].new_status).toBe('offer')

    expect(mockedRequest).toHaveBeenCalledWith(
      '/applications/app-1/history',
      { requiresAuth: true },
    )
  })

  it('кодирует ID при запросе отдельного отклика', async () => {
    mockedRequest.mockResolvedValue({
      id: 'app/123',
      status: 'applied',
    })

    await getApplication('app/123')

    expect(mockedRequest).toHaveBeenCalledWith(
      '/applications/app%2F123',
      { requiresAuth: true },
    )
  })
})
