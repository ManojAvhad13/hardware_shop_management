'use client'
// src/app/login/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShoppingBag, Lock, Mail, Wrench } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Invalid email or password')
      } else {
        toast.success('Welcome back!')
        router.push('/dashboard')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl shadow-glow-orange mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white">HardwareShop Pro</h1>
          <p className="text-slate-400 mt-2 text-sm">
            {process.env.NEXT_PUBLIC_SHOP_NAME || 'Complete Shop Management System'}
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@hardwareshop.com"
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-3 text-center font-medium uppercase tracking-wide">Demo Credentials</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'Admin', email: 'admin@hardwareshop.com', pass: 'Admin@123' },
                { role: 'Manager', email: 'manager@hardwareshop.com', pass: 'Manager@123' },
                { role: 'Staff', email: 'staff@hardwareshop.com', pass: 'Staff@123' },
              ].map(cred => (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => {
                    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
                    const passInput = document.querySelector('input[type="password"], input[type="text"]') as HTMLInputElement
                    if (emailInput) emailInput.value = cred.email
                    if (passInput) passInput.value = cred.pass
                  }}
                  className="text-center p-2 rounded-lg bg-slate-700/40 hover:bg-slate-700/70
                             border border-slate-600/30 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-brand-400">{cred.role}</p>
                  <p className="text-[10px] text-slate-500 truncate">{cred.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} HardwareShop Pro. All rights reserved.
        </p>
      </div>
    </div>
  )
}
