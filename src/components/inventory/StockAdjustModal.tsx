'use client'
// src/components/inventory/StockAdjustModal.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, TrendingUp, TrendingDown, Package } from 'lucide-react'

interface Product {
  id: string | number
  name: string
  sku: string
  currentStock: number
  minStockLevel: number
  unit: string
}

export default function StockAdjustModal({
  product,
  onClose,
  onSuccess,
}: {
  product: Product
  onClose: () => void
  onSuccess: () => void
}) {
  const [type, setType] = useState<'add' | 'remove'>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const mutation = useMutation({
    // Updated signature to pass explicit movement data to the backend
    mutationFn: (data: {
      currentStock: number;
      reason: string;
      type: 'STOCK_IN' | 'STOCK_OUT';
      quantity: number;
    }) => axios.patch(`/api/inventory/${product.id}`, data),
    onSuccess: () => {
      toast.success('Stock adjusted successfully!')
      onSuccess()
    },
    onError: () => toast.error('Failed to adjust stock'),
  })

  const qty = Number(quantity) || 0
  const newStock = type === 'add'
    ? product.currentStock + qty
    : Math.max(0, product.currentStock - qty)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Quantity Validation
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    const finalReason = reason === 'Other' ? customReason.trim() : reason

    // 2. Reason Validation
    if (!finalReason) {
      toast.error('Please provide a reason for the adjustment')
      return
    }

    // 3. Send enriched data to the backend
    mutation.mutate({
      currentStock: newStock,
      reason: finalReason,
      type: type === 'add' ? 'STOCK_IN' : 'STOCK_OUT',
      quantity: qty
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Adjust Stock</h2>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">
            {/* Current stock */}
            <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/50">
              <div>
                <p className="text-xs text-slate-400">Current Stock</p>
                <p className="text-2xl font-bold text-white">{product.currentStock}</p>
                <p className="text-xs text-slate-500">{product.unit}s</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">SKU</p>
                <p className="font-mono text-sm text-slate-300">{product.sku}</p>
                <p className="text-xs text-slate-500 mt-1">Min: {product.minStockLevel}</p>
              </div>
            </div>

            {/* Adjustment type */}
            <div>
              <label className="label">Adjustment Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('add')}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${type === 'add'
                    ? 'border-green-500/50 bg-green-500/15 text-green-400'
                    : 'border-slate-600/50 bg-slate-800/40 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Stock In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('remove')}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${type === 'remove'
                    ? 'border-red-500/50 bg-red-500/15 text-red-400'
                    : 'border-slate-600/50 bg-slate-800/40 text-slate-400 hover:border-slate-500'
                    }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">Stock Out</span>
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="label">Quantity *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder={`Enter quantity to ${type === 'add' ? 'add' : 'remove'}`}
                className="input w-full"
                autoFocus
              />
            </div>

            {/* New stock preview */}
            {qty > 0 && (
              <div className={`flex items-center justify-between p-3 rounded-xl border ${newStock === 0
                ? 'border-red-500/30 bg-red-500/10'
                : newStock <= product.minStockLevel
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-green-500/30 bg-green-500/10'
                }`}>
                <span className="text-sm text-slate-400">New stock level</span>
                <span className={`text-xl font-bold ${newStock === 0 ? 'text-red-400' : newStock <= product.minStockLevel ? 'text-amber-400' : 'text-green-400'
                  }`}>
                  {newStock} {product.unit}s
                </span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="label">Reason *</label>
              <select
                value={reason}
                onChange={e => {
                  setReason(e.target.value)
                  if (e.target.value !== 'Other') setCustomReason('')
                }}
                className="select mb-2 w-full"
              >
                <option value="">Select reason...</option>
                <option value="Purchase received">Purchase received</option>
                <option value="Return from customer">Return from customer</option>
                <option value="Damaged / expired">Damaged / expired</option>
                <option value="Stock count correction">Stock count correction</option>
                <option value="Transfer to another branch">Transfer to another branch</option>
                <option value="Other">Other</option>
              </select>

              {reason === 'Other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Type a custom reason..."
                  className="input w-full mt-2"
                  required
                />
              )}
            </div>
          </div>

          <div className="modal-footer mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={mutation.isPending || !qty || (!reason && !customReason)}
              className={type === 'add' ? 'btn-success' : 'btn-danger'}
            >
              {mutation.isPending ? 'Saving...' : `${type === 'add' ? 'Add' : 'Remove'} ${qty || 0} ${product.unit}s`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}