import { apiRequest } from './api'

export type ApplicationStatistics = {
  total_applications: number
  by_status: {
    applied: number
    hr_interview: number
    technical_interview: number
    test_task: number
    offer: number
    rejected: number
  }
}

export async function getApplicationStatistics(): Promise<ApplicationStatistics> {
  return apiRequest<ApplicationStatistics>('/statistics', {
    requiresAuth: true,
  })
}
