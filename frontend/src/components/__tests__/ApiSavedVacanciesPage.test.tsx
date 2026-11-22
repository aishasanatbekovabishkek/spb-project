
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import ApiSavedVacanciesPage from '../ApiSavedVacanciesPage'

import {
  deleteSavedVacancy,
  getSavedVacancies,
} from '../../services/savedVacancies'

vi.mock('../../services/savedVacancies', () => ({
  getSavedVacancies: vi.fn(),
  deleteSavedVacancy: vi.fn(),
}))

const mockedGetSaved = vi.mocked(getSavedVacancies)
const mockedDeleteSaved = vi.mocked(deleteSavedVacancy)

const exampleVacancy = {
  id: 'saved-1',
  vacancy_id: 'vacancy-1',
  source: 'trudvsem',
  external_id: '123',
  title: 'Python Developer',
  company: 'Example Company',
  url: 'https://example.com/vacancy/123',
  created_at: '2026-11-22T12:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()

  mockedGetSaved.mockResolvedValue({
    items: [exampleVacancy],
    page: 1,
    per_page: 20,
    total: 1,
  })
})

afterEach(() => {
  cleanup()
})

describe('Saved vacancies page', () => {
  it('показывает загрузку данных', () => {
    render(<ApiSavedVacanciesPage />)

    expect(
      screen.getByText('Загружаем сохранённые вакансии...'),
    ).toBeTruthy()
  })

  it('отображает сохранённую вакансию', async () => {
    render(<ApiSavedVacanciesPage />)

    expect(
      await screen.findByText('Python Developer'),
    ).toBeTruthy()

    expect(
      screen.getByText('Example Company'),
    ).toBeTruthy()

    expect(mockedGetSaved).toHaveBeenCalledOnce()
  })

  it('показывает пустое состояние', async () => {
    mockedGetSaved.mockResolvedValue({
      items: [],
      page: 1,
      per_page: 20,
      total: 0,
    })

    render(<ApiSavedVacanciesPage />)

    expect(
      await screen.findByText('Пока ничего не сохранено'),
    ).toBeTruthy()
  })

  it('удаляет вакансию из интерфейса', async () => {
    mockedDeleteSaved.mockResolvedValue(undefined)

    render(<ApiSavedVacanciesPage />)

    expect(
      await screen.findByText('Python Developer'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Удалить сохранённую вакансию',
      }),
    )

    await waitFor(() => {
      expect(mockedDeleteSaved).toHaveBeenCalledWith(
        'saved-1',
      )
    })

    await waitFor(() => {
      expect(
        screen.queryByText('Python Developer'),
      ).toBeNull()
    })

    expect(
      screen.getByText('Пока ничего не сохранено'),
    ).toBeTruthy()
  })

  it('показывает ошибку загрузки', async () => {
    mockedGetSaved.mockRejectedValue(
      new Error('Server unavailable'),
    )

    render(<ApiSavedVacanciesPage />)

    expect(
      await screen.findByRole('alert'),
    ).toHaveProperty(
      'textContent',
      'Не удалось загрузить сохранённые вакансии.',
    )
  })

  it('сохраняет вакансию в списке при ошибке удаления', async () => {
    mockedDeleteSaved.mockRejectedValue(
      new Error('Delete failed'),
    )

    render(<ApiSavedVacanciesPage />)

    expect(
      await screen.findByText('Python Developer'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Удалить сохранённую вакансию',
      }),
    )

    expect(
      await screen.findByRole('alert'),
    ).toHaveProperty(
      'textContent',
      'Не удалось удалить вакансию.',
    )

    expect(
      screen.getByText('Python Developer'),
    ).toBeTruthy()
  })
})
