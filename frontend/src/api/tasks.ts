import client from './client'
import { Task, TaskAssignment, TaskListOut } from '../types'

export const getTasks = async (page = 1, status?: string): Promise<TaskListOut> => {
  const params: Record<string, unknown> = { page, page_size: 20 }
  if (status) params.status = status
  const res = await client.get('/tasks', { params })
  return res.data
}

export const getTask = async (id: string): Promise<Task> => {
  const res = await client.get(`/tasks/${id}`)
  return res.data
}

export const createTask = async (data: {
  title: string
  type: string
  prompt: string
  expected_behavior?: string
}): Promise<Task> => {
  const res = await client.post('/tasks', data)
  return res.data
}

export const updateTask = async (id: string, data: Partial<Task>): Promise<Task> => {
  const res = await client.put(`/tasks/${id}`, data)
  return res.data
}

export const assignTask = async (taskId: string, annotatorIds: string[]): Promise<TaskAssignment[]> => {
  const res = await client.post(`/tasks/${taskId}/assign`, { annotator_ids: annotatorIds })
  return res.data
}

export const getTaskAssignments = async (taskId: string): Promise<TaskAssignment[]> => {
  const res = await client.get(`/tasks/${taskId}/assignments`)
  return res.data
}

export const getTaskFeedback = async (taskId: string) => {
  const res = await client.get(`/feedback/${taskId}`)
  return res.data
}