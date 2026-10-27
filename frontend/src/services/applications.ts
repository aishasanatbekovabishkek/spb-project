
import { apiRequest } from './api'

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

export type StatusHistoryItem = {
  id: string
  application_id: string
  status: ApplicationStatus
  created_at: string
}

export async function getApplications(): Promise<Application[]> {
  return apiRequest<Application[]>('/applications', {
    requiresAuth: true,
  })
}

export async function createApplication(
  vacancyId: string,
): Promise<Application> {
  return apiRequest<Application>('/applications', {
    method: 'POST',
    body: { vacancy_id: vacancyId },
    requiresAuth: true,
  })
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<Application> {
  return apiRequest<Application>(
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
): Promise<StatusHistoryItem[]> {
  return apiRequest<StatusHistoryItem[]>(
    `/applications/${encodeURIComponent(id)}/history`,
    { requiresAuth: true },
  )
}
