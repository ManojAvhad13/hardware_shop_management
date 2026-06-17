'use client'
// src/components/settings/UserModal.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Users } from 'lucide-react'

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT']),
  phone: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT']),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
})

type FormValues = {
  name: string
  email: string
  password?: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'ACCOUNTANT'
  phone?: string
  isActive?: boolean
}

export default function UserModal({
  user,
  onClose,
  onSuccess,
}: {
  user?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!user
  const schema = isEdit ? editSchema : createSchema

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: user
      ? { name: user.name, email: user.email, role: user.role, phone: user.phone || '', isActive: user.isActive }
      : { role: 'STAFF' },
  })

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? axios.patch(`/api/users/${user.id}`, data) : axios.post('/api/users', data),
    onSuccess: () => {
      toast.success(isEdit ? 'User updated!' : 'User created!')
      onSuccess()
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Something went wrong'),
  })

  const isLoading = mutation.status === 'pending'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit User' : 'Add User'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="John Doe" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message as string}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="user@shop.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message as string}</p>}
            </div>
            <div>
              <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input
                {...register('password')}
                type="password"
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder={isEdit ? '••••••••' : 'Min 8 characters'}
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message as string}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role *</label>
                <select {...register('role')} className="select">
                  {['ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input" placeholder="+91-XXXXXXXXXX" />
              </div>
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input {...register('isActive')} type="checkbox" className="w-4 h-4 accent-brand-500 rounded" />
                <span className="text-sm text-slate-300">Account Active</span>
              </label>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
