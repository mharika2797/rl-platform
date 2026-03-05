import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getTasks, createTask } from '../../api/tasks'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

interface TaskForm {
  title: string
  type: 'coding' | 'reasoning' | 'qa'
  prompt: string
  expected_behavior: string
}

export default function Tasks() {
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
    refetchInterval: 10000,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>()

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created')
      reset()
      setShowForm(false)
      navigate(`/tasks/${newTask.id}`) 
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to create task'),
  })

  const onSubmit = (data: TaskForm) => mutation.mutate(data)

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">Researcher</p>
          <h1 className="text-2xl font-bold text-slate-200">Tasks</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Task'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <p className="text-xs font-mono text-slate-400 tracking-widest uppercase mb-4">New Task</p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Title"
              placeholder="Reverse a linked list"
              error={errors.title?.message}
              {...register('title', { required: 'Title is required' })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-400 tracking-widest uppercase">Type</label>
              <select
                className="w-full px-3 py-2.5 rounded bg-white/5 border border-white/10 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                {...register('type')}
              >
                <option value="coding">Coding</option>
                <option value="reasoning">Reasoning</option>
                <option value="qa">Q&A</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-400 tracking-widest uppercase">Prompt</label>
              <textarea
                rows={4}
                placeholder="Write a function to..."
                className="w-full px-3 py-2.5 rounded bg-white/5 border border-white/10 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none placeholder:text-slate-600"
                {...register('prompt', { required: 'Prompt is required' })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-400 tracking-widest uppercase">Expected Behavior</label>
              <textarea
                rows={2}
                placeholder="Should return..."
                className="w-full px-3 py-2.5 rounded bg-white/5 border border-white/10 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none placeholder:text-slate-600"
                {...register('expected_behavior')}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={mutation.isPending}>Create Task</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Task list */}
      {isLoading ? (
        <p className="text-slate-600 font-mono text-sm">Loading...</p>
      ) : data?.items.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm font-mono">No tasks yet. Create your first one above.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {data?.items.map(task => (
            <Card key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{task.title}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1 line-clamp-2">{task.prompt}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge label={task.type} variant="purple" />
                  <Badge
                    label={task.status}
                    variant={task.status === 'active' ? 'cyan' : task.status === 'completed' ? 'green' : 'slate'}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}