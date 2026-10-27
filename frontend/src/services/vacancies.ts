
import { apiRequest } from './api'

export type ExternalVacancyId = {
  source: string
  external_id: string
}

export type Vacancy = ExternalVacancyId & {
  title: string
  company: string | null
  url: string | null
}

export type VacancyDetails = Vacancy & {
  description: string | null
  is_stale: boolean
}

export type VacancySearchResponse = {
  items: Vacancy[]
  page: number
  per_page: number
  total: number
  is_stale: boolean
}

export async function searchVacancies(
  query: string,
  page = 1,
  perPage = 20,
  signal?: AbortSignal,
): Promise<VacancySearchResponse> {
  const params = new URLSearchParams({
    query: query.trim(),
    page: String(page),
    per_page: String(perPage),
  })

  return apiRequest<VacancySearchResponse>(
    `/vacancies?${params.toString()}`,
    { signal },
  )
}

export async function getVacancyDetails(
  source: string,
  externalId: string,
  signal?: AbortSignal,
): Promise<VacancyDetails> {
  return apiRequest<VacancyDetails>(
    `/vacancies/${encodeURIComponent(source)}/${encodeURIComponent(externalId)}`,
    { signal },
  )
}
