'use client'
// src/components/inventory/ProductModal.tsx
import { useForm, type Path } from 'react-hook-form'
import type { InputHTMLAttributes } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Package } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  sku: z.string().min(2, 'SKU required'),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, 'Category required'),
  supplierId: z.string().optional(),
  unit: z.string().default('piece'),
  costPrice: z.coerce.number().positive('Cost price must be positive'),
  sellingPrice: z.coerce.number().positive('Selling price must be positive'),
  mrp: z.coerce.number().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  currentStock: z.coerce.number().int().min(0).default(0),
  minStockLevel: z.coerce.number().int().min(0).default(10),
  maxStockLevel: z.coerce.number().int().min(0).default(1000),
  location: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const UNITS = ['piece', 'pair', 'set', 'roll', 'meter', 'kg', 'litre', 'box', 'pack', 'bundle', 'bag', 'can', 'sheet']

export default function ProductModal({
  product,
  onClose,
  onSuccess,
}: {
  product?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!product

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axios.get('/api/inventory/categories').then(r => r.data),
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => axios.get('/api/suppliers').then(r => r.data),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
        ...product,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp || undefined,
        taxRate: product.taxRate,
        supplierId: product.supplierId || '',
      }
      : { taxRate: 18, minStockLevel: 10, maxStockLevel: 1000, unit: 'piece' },
  })

  const costPrice = watch('costPrice')
  const sellingPrice = watch('sellingPrice')
  const margin = costPrice && sellingPrice && costPrice > 0
    ? (((sellingPrice - costPrice) / costPrice) * 100).toFixed(1)
    : 0

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? axios.patch(`/api/inventory/${product.id}`, data)
        : axios.post('/api/inventory', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated!' : 'Product added!')
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Something went wrong')
    },
  })

  type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string
    name: Path<FormData>
    type?: string
  }

  const Field = ({ label, name, type = 'text', ...props }: FieldProps) => {
    const error = errors[name]

    return (
      <div>
        <label className="label">{label}</label>
        <input
          {...register(name)}
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          className={`input ${error ? 'input-error' : ''}`}
          {...props}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error.message as string}</p>}
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
              <p className="text-xs text-slate-400">{isEdit ? product.sku : 'Fill in product details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="modal-body space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Product Name *" name="name" placeholder="e.g. Havells 1.5mm Wire (100m)" />
              </div>
              <Field label="SKU *" name="sku" placeholder="e.g. HVL-WIRE-1.5" />
              <Field label="Barcode" name="barcode" placeholder="e.g. 890123456789" />
            </div>

            {/* Category & Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Category *</label>
                <select {...register('categoryId')} className={`select ${errors.categoryId ? 'input-error' : ''}`}>
                  <option value="">Select category</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-red-400 text-xs mt-1">{errors.categoryId.message}</p>}
              </div>
              <div>
                <label className="label">Supplier</label>
                <select {...register('supplierId')} className="select">
                  <option value="">Select supplier</option>
                  {suppliers?.map((sup: any) => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pricing</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Cost Price (₹) *" name="costPrice" type="number" placeholder="0.00" />
                <Field label="Selling Price (₹) *" name="sellingPrice" type="number" placeholder="0.00" />
                <Field label="MRP (₹)" name="mrp" type="number" placeholder="0.00" />
                <div>
                  <label className="label">Tax Rate (%)</label>
                  <select {...register('taxRate')} className="select">
                    {[0, 5, 12, 18, 28].map(r => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>
              </div>
              {Number(margin) > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Profit margin:</span>
                  <span className={`text-xs font-semibold ${Number(margin) < 10 ? 'text-red-400' : Number(margin) < 20 ? 'text-amber-400' : 'text-green-400'}`}>
                    {margin}%
                  </span>
                </div>
              )}
            </div>

            {/* Stock */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Stock Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label={isEdit ? 'Current Stock' : 'Opening Stock'} name="currentStock" type="number" placeholder="0" />
                <Field label="Min Stock Level" name="minStockLevel" type="number" placeholder="10" />
                <Field label="Max Stock Level" name="maxStockLevel" type="number" placeholder="1000" />
                <div>
                  <label className="label">Unit</label>
                  <select {...register('unit')} className="select">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Location & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Storage Location" name="location" placeholder="e.g. Rack A, Shelf 3" />
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} rows={2} className="textarea" placeholder="Optional notes..." />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
