import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getQueue } from '../../api/annotator'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'

export default function Queue() {
  const navigate = useNavigate()
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: getQueue,
  })

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <p className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-1">Annotator</p>
        <h1 className="text-2xl font-bold text-slate-200">My Queue</h1>
        <p className="text-slate-500 text-sm font-mono mt-1">{queue.length} task{queue.length !== 1 ? 's' : ''} waiting</p>
      </div>

      {isLoading ? (
        <p className="text-slate-600 font-mono text-sm">Loading...</p>
      ) : queue.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm font-mono">No tasks assigned yet. Check back later.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {queue.map(item => (
            <Card
              key={item.assignment_id}
              onClick={() => navigate(`/annotate/${item.assignment_id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{item.task_title}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1 line-clamp-2">{item.task_prompt}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge label={item.task_type} variant="purple" />
                  <Badge
                    label={item.status}
                    variant={item.status === 'in_progress' ? 'amber' : 'slate'}
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