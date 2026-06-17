'use client'
// src/components/customers/CustomerDetailModal.tsx
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { X, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function CustomerDetailModal({
  customer,
  onClose,
}: {
  customer: any
  onClose: () => void
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['customer-history', customer.id],
    queryFn: () => axios.get(`/api/customers/${customer.id}/history`).then(r => r.data),
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl w-full">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-semibold text-white">{customer.name}</h2>
            <p className="text-xs text-slate-400">{customer.phone}</p>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <div className="modal-body space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Credit Limit', value: formatCurrency(customer.creditLimit), color: 'text-blue-400' },
              { label: 'Total Purchases', value: formatCurrency(history?.totalPurchases || 0), color: 'text-green-400' },
              { label: 'Balance Due', value: formatCurrency(customer.balance), color: customer.balance > 0 ? 'text-amber-400' : 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-slate-900/50 rounded-xl border border-slate-700/40">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-3">Recent Transactions</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-600" />
              </div>
            ) : history?.sales?.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {history?.sales?.slice(0, 10).map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{sale.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">{formatDate(sale.saleDate)} · {sale.items?.length} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-100">{formatCurrency(sale.totalAmount)}</p>
                      <span className={`badge text-xs ${
                        sale.paymentStatus === 'PAID' ? 'badge-green'
                        : sale.paymentStatus === 'PARTIAL' ? 'badge-amber'
                        : 'badge-red'
                      }`}>{sale.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
