export type UserRole = 'researcher' | 'annotator' | 'admin'
export type TaskType = 'coding' | 'reasoning' | 'qa'
export type TaskStatus = 'draft' | 'active' | 'completed' | 'archived'
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Task {
  id: string
  creator_id: string
  title: string
  type: TaskType
  prompt: string
  expected_behavior: string | null
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface TaskAssignment {
  id: string
  task_id: string
  annotator_id: string
  status: AssignmentStatus
  assigned_at: string
  completed_at: string | null
}

export interface QueueItem {
  assignment_id: string
  task_id: string
  task_title: string
  task_type: TaskType
  task_prompt: string
  status: AssignmentStatus
  assigned_at: string
}

export interface Feedback {
  id: string
  assignment_id: string
  agent_output_id: string | null
  reward_scalar: number | null
  rationale: string | null
  quality_score: number | null
  submitted_at: string
}

export interface TaskListOut {
  items: Task[]
  total: number
  page: number
  page_size: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}