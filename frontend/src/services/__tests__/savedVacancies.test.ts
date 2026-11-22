
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { apiRequest } from '../api'

import {
  getSavedVacancies,
  saveVacancy,
  deleteSavedVacancy,
} from '../savedVacancies'

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
}))

const mockedRequest = vi.mocked(apiRequest)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Saved vacancies service', () => {
  it('запрашивает первую страницу сохранённых вакансий', async () => {
    const response = {
      items: [],
      page: 1,
      per_page: 20,
      total: 0,
    }

    mockedRequest.mockResolvedValue(response)

    const result = await getSavedVacancies()

    expect(result).toEqual(response)

    expect(mockedRequest).toHaveBeenCalledWith(
      '/saved-vacancies?page=1&per_page=20',
      { requiresAuth: true },
    )
  })

  it('поддерживает пользовательскую пагинацию', async () => {
    mockedRequest.mockResolvedValue({
      items: [],
      page: 3,
      per_page: 10,
      total: 25,
    })

    await getSavedVacancies(3, 10)

    expect(mockedRequest).toHaveBeenCalledWith(
      '/saved-vacancies?page=3&per_page=10',
      { requiresAuth: true },
    )
  })

  it('сохраняет вакансию с правильными данными', async () => {
    const vacancy = {
      source: 'trudvsem',
      external_id: '12345',
    }

    const saved = {
      ...vacancy,
      id: 'saved-1',
      vacancy_id: 'vacancy-1',
      created_at: '2026-11-22T12:00:00Z',
    }

    mockedRequest.mockResolvedValue(saved)

    const result = await saveVacancy(vacancy)

    expect(result).toEqual(saved)

    expect(mockedRequest).toHaveBeenCalledWith(
      '/saved-vacancies',
      {
        method: 'POST',
        body: vacancy,
        requiresAuth: true,
      },
    )
  })

  it('удаляет вакансию по ID сохранения', async () => {
    mockedRequest.mockResolvedValue(undefined)

    await deleteSavedVacancy('saved-123')

    expect(mockedRequest).toHaveBeenCalledWith(
      '/saved-vacancies/saved-123',
      {
        method: 'DELETE',
        requiresAuth: true,
      },
    )
  })

  it('кодирует специальные символы в ID', async () => {
    mockedRequest.mockResolvedValue(undefined)

    await deleteSavedVacancy('abc/123')

    expect(mockedRequest).toHaveBeenCalledWith(
      '/saved-vacancies/abc%2F123',
      {
        method: 'DELETE',
        requiresAuth: true,
      },
    )
  })

  it('передаёт ошибку сервера вызывающему коду', async () => {
    const error = new Error(
      'Не удалось сохранить вакансию',
    )

    mockedRequest.mockRejectedValue(error)

    await expect(
      saveVacancy({
        source: 'trudvsem',
        external_id: '123',
      }),
    ).rejects.toThrow(
      'Не удалось сохранить вакансию',
    )
  })
})
