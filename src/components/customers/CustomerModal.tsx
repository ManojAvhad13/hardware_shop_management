'use client'
// src/components/customers/CustomerModal.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, User } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function CustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!customer

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ? {
      ...customer,
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      notes: customer.notes || '',
    } : { creditLimit: 0 },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? axios.patch(`/api/customers/${customer.id}`, data)
        : axios.post('/api/customers', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Customer updated!' : 'Customer added!')
      onSuccess()
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Something went wrong'),
  })

  type FieldProps = {
    label: string
    name: keyof FormData
    type?: string
    required?: boolean
    [key: string]: any
  }

  const Field = ({ label, name, type = 'text', required = false, ...rest }: FieldProps) => (
    <div>
      <label className="label">{label}{required && ' *'}</label>
      <input {...register(name as any)} type={type} className={`input ${errors[name] ? 'input-error' : ''}`} {...rest} />
      {errors[name] && <p className="text-red-400 text-xs mt-1">{(errors[name]?.message as string) || ''}</p>}
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" name="name" required placeholder="Rajesh Kumar" />
              <Field label="Phone" name="phone" required placeholder="+91-9876543210" />
              <Field label="Email" name="email" type="email" placeholder="email@example.com" />
              <Field label="GSTIN" name="gstin" placeholder="27AABCS1234A1Z5" />
              <Field label="Credit Limit (₹)" name="creditLimit" type="number" placeholder="0" />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea {...register('address')} rows={2} className="textarea" placeholder="Full address..." />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea {...register('notes')} rows={2} className="textarea" placeholder="Any notes about this customer..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
