import client from './client'
import { TokenResponse, User } from '../types'

export const login = async (email: string, password: string): Promise<TokenResponse> => {
  const res = await client.post('/auth/login', { email, password })
  return res.data
}

export const register = async (
  email: string,
  password: string,
  role: string,
  full_name?: string
): Promise<User> => {
  const res = await client.post('/auth/register', { email, password, role, full_name })
  return res.data
}

export const getMe = async (): Promise<User> => {
  const res = await client.get('/auth/me')
  return res.data
}