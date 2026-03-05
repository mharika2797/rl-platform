import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../../api/tasks'
import { useAuthStore } from '../../store/auth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
    refetchInterval: 10000,
  })

  const tasks = data?.items ?? []
  const active = tasks.filter(t => t.status === 'active').length
  const completed = tasks.filter(t => t.status === 'completed').length

  const handleExport = async () => {
    try {
      const res = await client.post('/exports', { min_quality_score: 0.0 })
      const jobId = res.data.export_job_id
      toast.success('Export started — preparing dataset...')

      const interval = setInterval(async () => {
        const status = await client.get(`/exports/${jobId}/status`)
        if (status.data.status === 'completed') {
          clearInterval(interval)
          toast.success('Dataset ready — downloading!')
          const downloadRes = await client.get(`/exports/${jobId}/download`, { responseType: 'blob' })
          const url = window.URL.createObjectURL(new Blob([downloadRes.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `rl_dataset_${jobId.slice(0, 8)}.jsonl`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
        } else if (status.data.status === 'failed') {
          clearInterval(interval)
          toast.error('Export failed')
        }
      }, 2000)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Export failed')
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-slate-200">
            Welcome back, {user?.full_name ?? user?.email}
          </h1>
        </div>
        <Button onClick={handleExport} variant="secondary">
          ⬇ Export Dataset
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Tasks', value: data?.total ?? 0, color: 'text-slate-200' },
          { label: 'Active', value: active, color: 'text-cyan-400' },
          { label: 'Completed', value: completed, color: 'text-emerald-400' },
        ].map(stat => (
          <Card key={stat.label}>
            <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Recent tasks */}
      <div>
        <p className="text-xs font-mono text-slate-500 tracking-widests uppercase mb-3">Recent Tasks</p>
        {isLoading ? (
          <p className="text-slate-600 font-mono text-sm">Loading...</p>
        ) : tasks.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-sm font-mono">No tasks yet — create your first task in Tasks.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.slice(0, 5).map(task => (
              <Card key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{task.title}</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{task.type}</p>
                  </div>
                  <Badge
                    label={task.status}
                    variant={task.status === 'active' ? 'cyan' : task.status === 'completed' ? 'green' : 'slate'}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}