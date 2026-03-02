import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { login, register } from '../api/auth'
import { useAuthStore } from '../store/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

interface FormData {
  email: string
  password: string
  full_name?: string
  role?: 'researcher' | 'annotator'
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register: reg, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await login(data.email, data.password)
        setAuth(res.access_token, res.user)
        const dest = res.user.role === 'annotator' ? '/queue' : '/dashboard'
        navigate(dest)
      } else {
        await register(data.email, data.password, data.role || 'annotator', data.full_name)
        toast.success('Account created — please sign in')
        setMode('login')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-cyan-500/8 border border-cyan-500/20 px-3 py-1.5 rounded mb-4">
            <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">⬡ RL Platform</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-200 tracking-tight">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-slate-500 text-sm font-mono mt-1">
            {mode === 'login' ? 'Training data platform' : 'Join the platform'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#0d1422] border border-[#1e2d45] rounded-lg p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {mode === 'register' && (
              <Input
                label="Full name"
                placeholder="Jane Smith"
                {...reg('full_name')}
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...reg('email', { required: 'Email is required' })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...reg('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
            />
            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-slate-400 tracking-widest uppercase">Role</label>
                <select
                  className="w-full px-3 py-2.5 rounded bg-white/5 border border-white/10 text-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  {...reg('role')}
                >
                  <option value="annotator">Annotator</option>
                  <option value="researcher">Researcher</option>
                </select>
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full justify-center mt-1">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </div>

        {/* Toggle */}
        <p className="text-center text-sm text-slate-600 font-mono mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}