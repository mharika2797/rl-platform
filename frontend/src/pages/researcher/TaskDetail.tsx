import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getTask, assignTask, getTaskAssignments, getTaskFeedback } from '../../api/tasks'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [annotatorId, setAnnotatorId] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id!),
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', id],
    queryFn: () => getTaskAssignments(id!),
  })

  const { data: feedback = [] } = useQuery({
    queryKey: ['feedback', id],
    queryFn: () => getTaskFeedback(id!),
  })

  const assignMutation = useMutation({
    mutationFn: () => assignTask(id!, [annotatorId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', id] })
      toast.success('Annotator assigned')
      setAnnotatorId('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to assign'),
  })

  if (isLoading) return <p className="text-slate-600 font-mono text-sm">Loading...</p>
  if (!task) return <p className="text-slate-600 font-mono text-sm">Task not found</p>

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tasks')}
          className="text-slate-500 hover:text-slate-300 font-mono text-sm transition-colors"
        >
          ← Tasks
        </button>
      </div>

      {/* Task info */}
      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-slate-200">{task.title}</h1>
          <div className="flex gap-2">
            <Badge label={task.type} variant="purple" />
            <Badge label={task.status} variant={task.status === 'active' ? 'cyan' : 'slate'} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Prompt</p>
            <p className="text-sm text-slate-300 font-mono bg-white/3 border border-white/5 rounded p-3 whitespace-pre-wrap">{task.prompt}</p>
          </div>
          {task.expected_behavior && (
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Expected Behavior</p>
              <p className="text-sm text-slate-400 font-mono">{task.expected_behavior}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Assign annotator */}
      <Card>
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">Assign Annotator</p>
        <div className="flex gap-2">
          <Input
            placeholder="Paste annotator UUID"
            value={annotatorId}
            onChange={e => setAnnotatorId(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => assignMutation.mutate()}
            loading={assignMutation.isPending}
            disabled={!annotatorId.trim()}
          >
            Assign
          </Button>
        </div>
        {assignments.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-t border-white/5">
                <span className="font-mono text-xs text-slate-500 truncate">{a.annotator_id}</span>
                <Badge
                  label={a.status}
                  variant={a.status === 'completed' ? 'green' : a.status === 'in_progress' ? 'amber' : 'slate'}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Feedback */}
      <Card>
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
          Feedback ({feedback.length})
        </p>
        {feedback.length === 0 ? (
          <p className="text-slate-600 text-sm font-mono">No feedback yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {feedback.map((f: any) => (
              <div key={f.id} className="border border-white/5 rounded p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">Reward</span>
                  <span className="text-sm font-bold text-cyan-400">{f.reward_scalar ?? '—'}</span>
                </div>
                {f.rationale && (
                  <p className="text-sm text-slate-400 font-mono">{f.rationale}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}