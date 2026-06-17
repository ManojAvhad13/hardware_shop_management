'use client'
// src/components/billing/InvoiceViewModal.tsx
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { X, Printer, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/pdf-generator'
import toast from 'react-hot-toast'

export default function InvoiceViewModal({
  saleId,
  onClose,
}: {
  saleId: string
  onClose: () => void
}) {
  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => axios.get(`/api/billing/${saleId}`).then(r => r.data),
  })

  const handlePrint = () => {
    if (!sale) return
    try {
      const pdf = generateInvoicePDF(sale)
      pdf.save(`invoice-${sale.invoiceNumber}.pdf`)
      toast.success('Invoice downloaded!')
    } catch {
      toast.error('Failed to generate PDF')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl w-full">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {sale?.invoiceNumber || 'Invoice'}
            </h2>
            {sale && <p className="text-xs text-slate-400">{formatDateTime(sale.saleDate)}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={!sale} className="btn-secondary btn-sm">
              <Printer className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-7 h-7 animate-spin text-slate-600" />
            </div>
          ) : sale ? (
            <div className="space-y-6">
              {/* Customer + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold text-slate-100">{sale.customer?.name || 'Walk-in Customer'}</p>
                  {sale.customer?.phone && <p className="text-sm text-slate-400">{sale.customer.phone}</p>}
                  {sale.customer?.gstin && <p className="text-xs text-slate-500">GSTIN: {sale.customer.gstin}</p>}
                </div>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Payment</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${
                      sale.paymentStatus === 'PAID' ? 'badge-green'
                      : sale.paymentStatus === 'PARTIAL' ? 'badge-amber'
                      : sale.paymentStatus === 'OVERDUE' ? 'badge-red'
                      : 'badge-blue'
                    }`}>{sale.paymentStatus}</span>
                    <span className="text-xs text-slate-400">{sale.paymentMethod}</span>
                  </div>
                  <p className="text-xs text-slate-500">By: {sale.user?.name}</p>
                  {sale.dueDate && <p className="text-xs text-amber-400">Due: {formatDate(sale.dueDate)}</p>}
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto rounded-xl border border-slate-700/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-700/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Tax</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items?.map((item: any, i: number) => (
                      <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                        <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-slate-200">{item.product?.name}</p>
                          <p className="text-xs text-slate-500">{item.product?.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {item.quantity} {item.product?.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {item.taxRate}% / {formatCurrency(item.taxAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-100">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(sale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST</span>
                    <span>+{formatCurrency(sale.taxAmount)}</span>
                  </div>
                  {sale.discountAmount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount</span>
                      <span>-{formatCurrency(sale.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-700/50 text-slate-100">
                    <span>Total</span>
                    <span className="text-brand-400">{formatCurrency(sale.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-400">
                    <span>Paid</span>
                    <span>{formatCurrency(sale.paidAmount)}</span>
                  </div>
                  {sale.dueAmount > 0 && (
                    <div className="flex justify-between font-semibold text-amber-400">
                      <span>Balance Due</span>
                      <span>{formatCurrency(sale.dueAmount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {sale.notes && (
                <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-300">{sale.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">Failed to load invoice</p>
          )}
        </div>
      </div>
    </div>
  )
}
