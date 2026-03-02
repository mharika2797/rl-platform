import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-mono text-slate-400 tracking-widest uppercase">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded
            bg-white/5 border text-slate-200 text-sm
            placeholder:text-slate-600 font-mono
            focus:outline-none focus:ring-1 focus:ring-cyan-500/50
            transition-colors duration-150
            ${error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs text-red-400 font-mono">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input