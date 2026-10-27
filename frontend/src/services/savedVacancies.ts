
import { apiRequest } from './api'
import type { ExternalVacancyId } from './vacancies'

export type SavedVacancy = ExternalVacancyId & {
  id: string
  vacancy_id: string
  created_at: string
  title?: string
  company?: string | null
  url?: string | null
}

export type SavedVacancyListResponse = {
  items: SavedVacancy[]
  page: number
  per_page: number
  total: number
}

export async function getSavedVacancies(
  page = 1,
  perPage = 20,
): Promise<SavedVacancyListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })

  return apiRequest<SavedVacancyListResponse>(
    `/saved-vacancies?${params.toString()}`,
    { requiresAuth: true },
  )
}

export async function saveVacancy(
  vacancy: ExternalVacancyId,
): Promise<SavedVacancy> {
  return apiRequest<SavedVacancy>(
    '/saved-vacancies',
    {
      method: 'POST',
      body: vacancy,
      requiresAuth: true,
    },
  )
}

export async function deleteSavedVacancy(
  savedVacancyId: string,
): Promise<void> {
  await apiRequest<void>(
    `/saved-vacancies/${encodeURIComponent(savedVacancyId)}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    },
  )
}
