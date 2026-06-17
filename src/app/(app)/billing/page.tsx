'use client'
// src/app/(app)/billing/page.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Plus, Search, Download, Eye, Printer, FileText,
  RefreshCw, XCircle, ShoppingCart
} from 'lucide-react'
import { formatCurrency, formatDate, debounce } from '@/lib/utils'
import { generateInvoicePDF, generateSalesReportPDF } from '@/lib/pdf-generator'
import InvoiceViewModal from '@/components/billing/InvoiceViewModal'
import PaymentModal from '@/components/billing/PaymentModal'

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'badge-green', PARTIAL: 'badge-amber',
    PENDING: 'badge-blue', OVERDUE: 'badge-red',
  }
  return <span className={map[status] || 'badge-slate'}>{status}</span>
}

export default function BillingPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [viewSale, setViewSale] = useState<any>(null)
  const [paymentSale, setPaymentSale] = useState<any>(null)

  const qc = useQueryClient()

  const debouncedSet = useCallback(debounce(setDebouncedSearch, 350), [])

  const { data, isLoading } = useQuery({
    queryKey: ['billing', debouncedSearch, paymentStatus, fromDate, toDate, page],
    queryFn: () => axios.get('/api/billing', {
      params: { search: debouncedSearch, paymentStatus, from: fromDate, to: toDate, page, pageSize: 20 },
    }).then(r => r.data),
  })

  const handleExportPDF = async () => {
    try {
      const res = await axios.get('/api/billing', {
        params: { search: debouncedSearch, paymentStatus, from: fromDate, to: toDate, pageSize: 500 },
      })
      const sales = res.data.data
      const totalSales = sales.reduce((s: number, sale: any) => s + sale.subtotal, 0)
      const totalTax = sales.reduce((s: number, sale: any) => s + sale.taxAmount, 0)
      const totalDiscount = sales.reduce((s: number, sale: any) => s + sale.discountAmount, 0)
      const grandTotal = sales.reduce((s: number, sale: any) => s + sale.totalAmount, 0)

      const pdf = generateSalesReportPDF({
        sales,
        from: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: toDate || new Date().toISOString(),
        totalSales,
        totalTax,
        totalDiscount,
        grandTotal,
      })
      pdf.save(`sales-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Report exported!')
    } catch {
      toast.error('Export failed')
    }
  }

  const handlePrintInvoice = async (sale: any) => {
    try {
      const res = await axios.get(`/api/billing/${sale.id}`)
      const pdf = generateInvoicePDF(res.data)
      pdf.save(`invoice-${sale.invoiceNumber}.pdf`)
    } catch {
      toast.error('Failed to generate invoice')
    }
  }

  const totalRevenue = data?.data?.reduce((s: number, sale: any) => s + sale.totalAmount, 0) || 0
  const totalDue = data?.data?.reduce((s: number, sale: any) => s + sale.dueAmount, 0) || 0
  const totalPaid = data?.data?.reduce((s: number, sale: any) => s + sale.paidAmount, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales & Billing</h1>
          <p className="page-subtitle">Manage invoices and track payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="btn-secondary btn-sm">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <Link href="/billing/new" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> New Sale
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Amount Collected', value: formatCurrency(totalPaid), color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Outstanding Due', value: formatCurrency(totalDue), color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(s => (
          <div key={s.label} className={`card p-5 flex items-center gap-4 ${s.bg} border-0`}>
            <div>
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{data?.total || 0} invoices</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search invoice, customer..."
            value={search}
            onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); setPage(1) }}
            className="input pl-10"
          />
        </div>
        <select
          value={paymentStatus}
          onChange={e => { setPaymentStatus(e.target.value); setPage(1) }}
          className="select w-full sm:w-36"
        >
          <option value="">All Status</option>
          {['PAID', 'PARTIAL', 'PENDING', 'OVERDUE'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
          className="input w-full sm:w-36" placeholder="From" />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }}
          className="input w-full sm:w-36" placeholder="To" />
        {(search || paymentStatus || fromDate || toDate) && (
          <button
            onClick={() => { setSearch(''); setDebouncedSearch(''); setPaymentStatus(''); setFromDate(''); setToDate(''); setPage(1) }}
            className="btn-ghost btn-sm"
          >
            <XCircle className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-7 h-7 text-slate-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading invoices...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Payment</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-500">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No invoices found</p>
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((sale: any) => (
                    <tr key={sale.id}>
                      <td>
                        <span className="font-mono text-xs text-brand-400 font-semibold">{sale.invoiceNumber}</span>
                      </td>
                      <td className="text-slate-400 text-xs">{formatDate(sale.saleDate)}</td>
                      <td>
                        <p className="text-slate-200 text-sm">{sale.customer?.name || 'Walk-in'}</p>
                        {sale.customer?.phone && (
                          <p className="text-xs text-slate-500">{sale.customer.phone}</p>
                        )}
                      </td>
                      <td className="text-slate-400">{sale.items?.length || 0}</td>
                      <td className="font-semibold text-slate-100">{formatCurrency(sale.totalAmount)}</td>
                      <td className="text-green-400">{formatCurrency(sale.paidAmount)}</td>
                      <td className={sale.dueAmount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                        {formatCurrency(sale.dueAmount)}
                      </td>
                      <td><PaymentBadge status={sale.paymentStatus} /></td>
                      <td className="text-slate-400 text-xs">{sale.paymentMethod}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewSale(sale)}
                            className="btn-ghost btn-icon btn-sm" title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(sale)}
                            className="btn-ghost btn-icon btn-sm" title="Print PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {sale.dueAmount > 0 && (
                            <button
                              onClick={() => setPaymentSale(sale)}
                              className="btn-success btn-sm px-2 py-1 text-xs"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              {((page - 1) * 20) + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <span className="text-sm text-slate-400">{page} / {data.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {viewSale && (
        <InvoiceViewModal
          saleId={viewSale.id}
          onClose={() => setViewSale(null)}
        />
      )}
      {paymentSale && (
        <PaymentModal
          sale={paymentSale}
          onClose={() => setPaymentSale(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['billing'] })
            qc.invalidateQueries({ queryKey: ['dashboard'] })
            setPaymentSale(null)
          }}
        />
      )}
    </div>
  )
}
