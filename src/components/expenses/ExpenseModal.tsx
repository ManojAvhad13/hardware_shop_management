'use client'
// src/components/expenses/ExpenseModal.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, DollarSign } from 'lucide-react'

const schema = z.object({
  categoryId: z.string().min(1, 'Category required'),
  title: z.string().min(2, 'Title required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD']),
  date: z.string(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ExpenseModal({
  expense,
  onClose,
  onSuccess,
}: {
  expense?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!expense

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => axios.get('/api/expenses/categories').then(r => r.data),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? { ...expense, date: expense.date?.slice(0, 10) }
      : { date: new Date().toISOString().slice(0, 10), paymentMode: 'CASH' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? axios.patch(`/api/expenses/${expense.id}`, data) : axios.post('/api/expenses', data),
    onSuccess: () => { toast.success(isEdit ? 'Expense updated!' : 'Expense added!'); onSuccess() },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Something went wrong'),
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Category *</label>
              <select {...register('categoryId')} className={`select ${errors.categoryId ? 'input-error' : ''}`}>
                <option value="">Select category</option>
                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="text-red-400 text-xs mt-1">{errors.categoryId.message}</p>}
            </div>
            <div>
              <label className="label">Title *</label>
              <input {...register('title')} className={`input ${errors.title ? 'input-error' : ''}`} placeholder="e.g. Monthly Rent" />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (₹) *</label>
                <input {...register('amount')} type="number" step="0.01" className={`input ${errors.amount ? 'input-error' : ''}`} placeholder="0.00" />
                {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="label">Date *</label>
                <input {...register('date')} type="date" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select {...register('paymentMode')} className="select">
                {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea {...register('notes')} rows={2} className="textarea" placeholder="Optional notes..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
