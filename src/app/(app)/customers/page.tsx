'use client'
// src/app/(app)/customers/page.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, Search, Users, DollarSign, Edit2, Eye, XCircle, RefreshCw, Bell } from 'lucide-react'
import { formatCurrency, formatDate, debounce } from '@/lib/utils'
import CustomerModal from '@/components/customers/CustomerModal'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal'
import ReminderModal from '@/components/customers/ReminderModal'

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [withDue, setWithDue] = useState(false)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)
  const [viewCustomer, setViewCustomer] = useState<any>(null)
  const [reminderCustomer, setReminderCustomer] = useState<any>(null)

  const debouncedSet = useCallback(debounce(setDebouncedSearch, 350), [])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, withDue, page],
    queryFn: () => axios.get('/api/customers', {
      params: { search: debouncedSearch, withDue, page, pageSize: 20 },
    }).then(r => r.data),
  })

  const totalDue = data?.data?.reduce((s: number, c: any) => s + c.balance, 0) || 0
  const withDueCount = data?.data?.filter((c: any) => c.balance > 0).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer accounts and outstanding dues</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: data?.total || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Customers with Due', value: withDueCount, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Total Outstanding', value: formatCurrency(totalDue), icon: DollarSign, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(s => (
          <div key={s.label} className={`card p-5 flex items-center gap-4 border border-slate-700/50 ${s.bg}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); setPage(1) }}
            className="input pl-10"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none px-3">
          <input
            type="checkbox"
            checked={withDue}
            onChange={e => { setWithDue(e.target.checked); setPage(1) }}
            className="w-4 h-4 accent-brand-500 rounded"
          />
          <span className="text-sm text-slate-300">With outstanding dues only</span>
        </label>
        {(search || withDue) && (
          <button onClick={() => { setSearch(''); setDebouncedSearch(''); setWithDue(false); setPage(1) }}
            className="btn-ghost btn-sm">
            <XCircle className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-7 h-7 animate-spin text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading customers...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th>Total Orders</th>
                  <th>Credit Limit</th>
                  <th>Balance Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No customers found</p>
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((customer: any) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-400 font-bold text-sm">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">{customer.name}</p>
                            {customer.email && <p className="text-xs text-slate-500">{customer.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-300">{customer.phone}</td>
                      <td className="text-slate-400 text-xs font-mono">{customer.gstin || '—'}</td>
                      <td className="text-slate-300">{customer.salesCount}</td>
                      <td className="text-slate-300">{formatCurrency(customer.creditLimit)}</td>
                      <td>
                        {customer.balance > 0 ? (
                          <span className="font-semibold text-amber-400">{formatCurrency(customer.balance)}</span>
                        ) : (
                          <span className="text-green-400 text-sm">✓ Clear</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewCustomer(customer)} className="btn-ghost btn-icon btn-sm" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditCustomer(customer)} className="btn-ghost btn-icon btn-sm" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {customer.balance > 0 && (
                            <button
                              onClick={() => setReminderCustomer(customer)}
                              className="btn-ghost btn-icon btn-sm text-amber-400"
                              title="Send reminder"
                            >
                              <Bell className="w-4 h-4" />
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

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">{data.total} customers</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <span className="text-sm text-slate-400">{page} / {data.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <CustomerModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowAdd(false) }}
        />
      )}
      {editCustomer && (
        <CustomerModal
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['customers'] }); setEditCustomer(null) }}
        />
      )}
      {viewCustomer && (
        <CustomerDetailModal customer={viewCustomer} onClose={() => setViewCustomer(null)} />
      )}
      {reminderCustomer && (
        <ReminderModal customer={reminderCustomer} onClose={() => setReminderCustomer(null)} />
      )}
    </div>
  )
}
