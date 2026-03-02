import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../../api/tasks'
import { useAuthStore } from '../../store/auth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  })

  const tasks = data?.items ?? []
  const active = tasks.filter(t => t.status === 'active').length
  const completed = tasks.filter(t => t.status === 'completed').length
  const draft = tasks.filter(t => t.status === 'draft').length

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <p className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">Overview</p>
        <h1 className="text-2xl font-bold text-slate-200">Welcome back, {user?.full_name ?? user?.email}</h1>
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
        <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mb-3">Recent Tasks</p>
        {isLoading ? (
          <p className="text-slate-600 font-mono text-sm">Loading...</p>
        ) : tasks.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-sm font-mono">No tasks yet — create your first task in Tasks.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.slice(0, 5).map(task => (
              <Card key={task.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">{task.title}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{task.type}</p>
                </div>
                <Badge
                  label={task.status}
                  variant={task.status === 'active' ? 'cyan' : task.status === 'completed' ? 'green' : 'slate'}
                />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}