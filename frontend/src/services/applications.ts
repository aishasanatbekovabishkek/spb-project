
import { apiRequest } from './api'
import type { ExternalVacancyId, Vacancy } from './vacancies'

export type ApplicationStatus =
  | 'applied'
  | 'hr_interview'
  | 'technical_interview'
  | 'test_task'
  | 'offer'
  | 'rejected'

export type Application = {
  id: string
  vacancy_id: string
  status: ApplicationStatus
  created_at: string
  updated_at: string
}

export type ApplicationWithVacancy = Application & {
  vacancy: Vacancy
}

export type ApplicationListResponse = {
  items: ApplicationWithVacancy[]
  page: number
  per_page: number
  total: number
}

export type StatusUpdateResponse = {
  id: string
  status: ApplicationStatus
  updated_at: string
}

export type StatusHistoryItem = {
  id: string
  old_status: ApplicationStatus | null
  new_status: ApplicationStatus
  changed_at: string
}

export type StatusHistoryResponse = {
  items: StatusHistoryItem[]
}

export async function getApplications(
  page = 1,
  perPage = 20,
  status?: ApplicationStatus,
): Promise<ApplicationListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })

  if (status) {
    params.set('status', status)
  }

  return apiRequest<ApplicationListResponse>(
    `/applications?${params.toString()}`,
    { requiresAuth: true },
  )
}

export async function getApplication(
  id: string,
): Promise<ApplicationWithVacancy> {
  return apiRequest<ApplicationWithVacancy>(
    `/applications/${encodeURIComponent(id)}`,
    { requiresAuth: true },
  )
}

export async function createApplication(
  vacancy: ExternalVacancyId,
): Promise<Application> {
  return apiRequest<Application>(
    '/applications',
    {
      method: 'POST',
      body: vacancy,
      requiresAuth: true,
    },
  )
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<StatusUpdateResponse> {
  return apiRequest<StatusUpdateResponse>(
    `/applications/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: { status },
      requiresAuth: true,
    },
  )
}

export async function getApplicationHistory(
  id: string,
): Promise<StatusHistoryResponse> {
  return apiRequest<StatusHistoryResponse>(
    `/applications/${encodeURIComponent(id)}/history`,
    { requiresAuth: true },
  )
}
