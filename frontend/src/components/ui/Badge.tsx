interface BadgeProps {
  label: string
  variant?: 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
}

const variants = {
  cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border border-red-500/20',
  purple: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  slate: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
}

export default function Badge({ label, variant = 'slate' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}