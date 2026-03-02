import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getQueue, startAssignment, skipAssignment, submitFeedback } from '../../api/annotator'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

interface FeedbackForm {
  reward_scalar: number
  rationale: string
}

export default function Annotate() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: queue = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: getQueue,
  })

  const item = queue.find(q => q.assignment_id === assignmentId)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FeedbackForm>({
    defaultValues: { reward_scalar: 0.5 }
  })

  const rewardValue = watch('reward_scalar')

  const startMutation = useMutation({
    mutationFn: () => startAssignment(assignmentId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue'] }),
  })

  const skipMutation = useMutation({
    mutationFn: () => skipAssignment(assignmentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      toast.success('Task skipped')
      navigate('/queue')
    },
  })

  const submitMutation = useMutation({
    mutationFn: (data: FeedbackForm) => submitFeedback({
      assignment_id: assignmentId!,
      reward_scalar: Number(data.reward_scalar),
      rationale: data.rationale,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] })
      toast.success('Feedback submitted!')
      navigate('/queue')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to submit'),
  })

  if (!item) return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500 font-mono text-sm">Loading task...</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/queue')}
          className="text-slate-500 hover:text-slate-300 font-mono text-sm transition-colors"
        >
          ← Queue
        </button>
      </div>

      {/* Task */}
      <Card>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-lg font-bold text-slate-200">{item.task_title}</h1>
          <Badge label={item.task_type} variant="purple" />
        </div>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Prompt</p>
        <p className="text-sm text-slate-300 font-mono bg-white/3 border border-white/5 rounded p-3 whitespace-pre-wrap">
          {item.task_prompt}
        </p>

        {item.status === 'pending' && (
          <Button
            onClick={() => startMutation.mutate()}
            loading={startMutation.isPending}
            className="mt-4"
          >
            Start Task
          </Button>
        )}
      </Card>

      {/* Feedback form */}
      {(item.status === 'in_progress' || item.status === 'pending') && (
        <Card>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-4">Submit Feedback</p>
          <form onSubmit={handleSubmit(d => submitMutation.mutate(d))} className="flex flex-col gap-5">

            {/* Reward slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Reward Signal
                </label>
                <span className="text-lg font-bold text-cyan-400 font-mono">
                  {Number(rewardValue).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                className="w-full accent-cyan-400"
                {...register('reward_scalar', { required: true })}
              />
              <div className="flex justify-between text-xs font-mono text-slate-600">
                <span>0.0 — Poor</span>
                <span>0.5 — Okay</span>
                <span>1.0 — Excellent</span>
              </div>
            </div>

            {/* Rationale */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Rationale
              </label>
              <textarea
                rows={4}
                placeholder="Explain your rating..."
                className="w-full px-3 py-2.5 rounded bg-white/5 border border-white/10 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none placeholder:text-slate-600"
                {...register('rationale', { required: 'Rationale is required', minLength: { value: 5, message: 'Too short' } })}
              />
              {errors.rationale && <span className="text-xs text-red-400 font-mono">{errors.rationale.message}</span>}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => skipMutation.mutate()}
                loading={skipMutation.isPending}
              >
                Skip
              </Button>
              <Button type="submit" loading={submitMutation.isPending}>
                Submit Feedback
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}