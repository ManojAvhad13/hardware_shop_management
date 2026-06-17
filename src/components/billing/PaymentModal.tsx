'use client'
// src/components/billing/PaymentModal.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PaymentModal({
  sale,
  onClose,
  onSuccess,
}: {
  sale: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState(sale.dueAmount.toFixed(2))
  const [method, setMethod] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: (data: any) => axios.post(`/api/billing/${sale.id}/payment`, data),
    onSuccess: () => {
      toast.success('Payment recorded!')
      onSuccess()
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to record payment'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return }
    if (amt > sale.dueAmount) { toast.error(`Cannot pay more than due (${formatCurrency(sale.dueAmount)})`); return }
    mutation.mutate({ amount: amt, method, referenceNo, notes })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Record Payment</h2>
              <p className="text-xs text-slate-400">{sale.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Invoice summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: formatCurrency(sale.totalAmount), color: 'text-slate-100' },
                { label: 'Paid', value: formatCurrency(sale.paidAmount), color: 'text-green-400' },
                { label: 'Due', value: formatCurrency(sale.dueAmount), color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className={`font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Payment Amount (₹) *</label>
                <button type="button" onClick={() => setAmount(sale.dueAmount.toFixed(2))}
                  className="text-xs text-brand-400 hover:text-brand-300">Full due</button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input text-lg font-semibold"
                step="0.01" min="0.01"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Payment Method *</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className="select">
                {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {method !== 'CASH' && (
              <div>
                <label className="label">Reference / Transaction No</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={e => setReferenceNo(e.target.value)}
                  className="input"
                  placeholder="UTR / Cheque no / Transaction ID"
                />
              </div>
            )}

            <div>
              <label className="label">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-success">
              {mutation.isPending ? 'Recording...' : `Record ₹${parseFloat(amount) || 0} Payment`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
