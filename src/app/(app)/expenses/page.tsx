'use client'
// src/app/(app)/expenses/page.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, DollarSign, Edit2, Trash2, Search, XCircle, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate, debounce } from '@/lib/utils'
import ExpenseModal from '@/components/expenses/ExpenseModal'

export default function ExpensesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [editExpense, setEditExpense] = useState<any>(null)

  const debouncedSet = useCallback(debounce(setDebouncedSearch, 350), [])

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', debouncedSearch, categoryFilter, fromDate, toDate, page],
    queryFn: () => axios.get('/api/expenses', {
      params: { search: debouncedSearch, category: categoryFilter, from: fromDate, to: toDate, page, pageSize: 20 },
    }).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => axios.get('/api/expenses/categories').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense deleted') },
    onError: () => toast.error('Delete failed'),
  })

  const totalAmount = data?.data?.reduce((s: number, e: any) => s + e.amount, 0) || 0

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track operating costs and outflows</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="card p-5 flex items-center gap-4 bg-red-500/10 border-red-500/20">
        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Total Expenses (filtered)</p>
          <p className="text-2xl font-display font-bold text-red-400">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-slate-500">{data?.total || 0} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); setPage(1) }}
            className="input pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
          className="select w-full sm:w-40"
        >
          <option value="">All Categories</option>
          {categories?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }} className="input w-full sm:w-36" />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }} className="input w-full sm:w-36" />
        {(search || categoryFilter || fromDate || toDate) && (
          <button onClick={() => { setSearch(''); setDebouncedSearch(''); setCategoryFilter(''); setFromDate(''); setToDate(''); setPage(1) }} className="btn-ghost btn-sm">
            <XCircle className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-7 h-7 animate-spin text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Payment Mode</th>
                  <th className="text-right">Amount</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No expenses found</p>
                    </td>
                  </tr>
                ) : data?.data?.map((expense: any) => (
                  <tr key={expense.id}>
                    <td className="text-slate-400 text-xs whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="font-medium text-slate-200">{expense.title}</td>
                    <td>
                      <span
                        className="badge"
                        style={{ background: expense.category?.color + '20', color: expense.category?.color, borderColor: expense.category?.color + '40' }}
                      >
                        {expense.category?.name}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">{expense.paymentMode}</td>
                    <td className="text-right font-semibold text-red-400">{formatCurrency(expense.amount)}</td>
                    <td className="text-slate-500 text-xs max-w-[120px] truncate">{expense.notes || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditExpense(expense)} className="btn-ghost btn-icon btn-sm">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirm('Delete this expense?') && deleteMutation.mutate(expense.id)}
                          className="btn-danger btn-icon btn-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">{data.total} expenses</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <span className="text-sm text-slate-400">{page} / {data.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <ExpenseModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['expenses'] }); setShowAdd(false) }}
        />
      )}
      {editExpense && (
        <ExpenseModal
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['expenses'] }); setEditExpense(null) }}
        />
      )}
    </div>
  )
}
