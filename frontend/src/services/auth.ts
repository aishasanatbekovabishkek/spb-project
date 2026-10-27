
import { apiRequest, setAccessToken } from './api'

export type AuthCredentials = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  email: string
}

export type AuthResponse = {
  access_token: string
  token_type: string
}

export async function login(
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: credentials,
    },
  )

  setAccessToken(response.access_token)

  return response
}

export async function register(
  credentials: AuthCredentials,
): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/register', {
    method: 'POST',
    body: credentials,
  })
}

export function logout(): void {
  setAccessToken(null)
}
