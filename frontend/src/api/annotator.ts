import client from './client'
import { AgentOutput, Feedback, QueueItem } from '../types'

export const getQueue = async (): Promise<QueueItem[]> => {
  const res = await client.get('/annotator/queue')
  return res.data
}

export const getAssignmentOutputs = async (assignmentId: string): Promise<AgentOutput[]> => {
  const res = await client.get(`/annotator/queue/${assignmentId}/outputs`)
  return res.data
}

export const startAssignment = async (assignmentId: string): Promise<QueueItem> => {
  const res = await client.post(`/annotator/queue/${assignmentId}/start`)
  return res.data
}

export const skipAssignment = async (assignmentId: string): Promise<void> => {
  await client.post(`/annotator/queue/${assignmentId}/skip`)
}

export const submitFeedback = async (data: {
  assignment_id: string
  agent_output_id?: string
  reward_scalar: number
  rationale: string
}): Promise<Feedback> => {
  const res = await client.post('/feedback', data)
  return res.data
}