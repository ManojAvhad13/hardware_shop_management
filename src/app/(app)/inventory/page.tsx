'use client'
// src/app/(app)/inventory/page.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus, Search, Filter, Download, Edit2, Trash2, Package,
  AlertTriangle, XCircle, TrendingDown, BarChart2, RefreshCw
} from 'lucide-react'
import { formatCurrency, getStockStatus, debounce } from '@/lib/utils'
import { generateInventoryReportPDF } from '@/lib/pdf-generator'
import ProductModal from '@/components/inventory/ProductModal'
import StockAdjustModal from '@/components/inventory/StockAdjustModal'
import { useSession } from 'next-auth/react'

export default function InventoryPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const canEdit = ['ADMIN', 'MANAGER'].includes(role)

  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState(searchParams.get('filter') || '')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [adjustProduct, setAdjustProduct] = useState<any>(null)

  const debouncedSetSearch = useCallback(
    debounce((val: string) => setDebouncedSearch(val), 350),
    []
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['inventory', debouncedSearch, categoryFilter, stockFilter, page],
    queryFn: () => axios.get('/api/inventory', {
      params: { search: debouncedSearch, category: categoryFilter, filter: stockFilter, page, pageSize: 25 },
    }).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axios.get('/api/inventory/categories').then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Product deactivated')
    },
    onError: () => toast.error('Failed to delete product'),
  })

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    debouncedSetSearch(e.target.value)
    setPage(1)
  }

  const handleExport = async () => {
    try {
      const res = await axios.get('/api/inventory', { params: { pageSize: 1000 } })
      const pdf = generateInventoryReportPDF(res.data.data)
      pdf.save(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Report exported!')
    } catch {
      toast.error('Export failed')
    }
  }

  const stats = data ? {
    total: data.total,
    lowStock: data.data?.filter((p: any) => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length,
    outOfStock: data.data?.filter((p: any) => p.currentStock === 0).length,
    totalValue: data.data?.reduce((s: number, p: any) => s + p.currentStock * p.costPrice, 0) || 0,
  } : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Track stock levels, costs, and product details</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary btn-sm gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          {canEdit && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: data?.total || 0, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10', filter: '' },
          { label: 'Low Stock', value: stats?.lowStock || 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', filter: 'low-stock' },
          { label: 'Out of Stock', value: stats?.outOfStock || 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', filter: 'out-of-stock' },
          { label: 'Inventory Value', value: formatCurrency(stats?.totalValue || 0), icon: BarChart2, color: 'text-green-400', bg: 'bg-green-500/10', filter: '' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => s.filter && setStockFilter(s.filter === stockFilter ? '' : s.filter)}
            className={`stat-card text-left ${s.filter && s.filter === stockFilter ? 'border-brand-500/40' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={handleSearch}
            className="input pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
          className="select w-full sm:w-44"
        >
          <option value="">All Categories</option>
          {categories?.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={e => { setStockFilter(e.target.value); setPage(1) }}
          className="select w-full sm:w-40"
        >
          <option value="">All Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        {(search || categoryFilter || stockFilter) && (
          <button
            onClick={() => { setSearch(''); setDebouncedSearch(''); setCategoryFilter(''); setStockFilter(''); setPage(1) }}
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
            <RefreshCw className="w-8 h-8 text-slate-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading inventory...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Tax</th>
                  <th>Stock</th>
                  <th>Min Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-500">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No products found</p>
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((product: any) => {
                    const status = getStockStatus(product.currentStock, product.minStockLevel)
                    return (
                      <tr key={product.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-200">{product.name}</p>
                            {product.location && (
                              <p className="text-xs text-slate-500">📍 {product.location}</p>
                            )}
                          </div>
                        </td>
                        <td><span className="font-mono text-xs text-slate-400">{product.sku}</span></td>
                        <td>
                          <span
                            className="badge text-xs"
                            style={{ background: product.category?.color + '20', color: product.category?.color, borderColor: product.category?.color + '40' }}
                          >
                            {product.category?.name}
                          </span>
                        </td>
                        <td className="text-slate-300">{formatCurrency(product.costPrice)}</td>
                        <td className="font-semibold text-slate-100">{formatCurrency(product.sellingPrice)}</td>
                        <td className="text-slate-400">{product.taxRate}%</td>
                        <td>
                          <span className={`font-bold ${product.currentStock === 0 ? 'text-red-400' : product.currentStock <= product.minStockLevel ? 'text-amber-400' : 'text-slate-200'}`}>
                            {product.currentStock}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">{product.unit}</span>
                        </td>
                        <td className="text-slate-400">{product.minStockLevel}</td>
                        <td>
                          <span className={`badge ${status.color === 'red' ? 'badge-red' : status.color === 'amber' ? 'badge-amber' : 'badge-green'}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => setAdjustProduct(product)}
                                  className="btn-ghost btn-icon btn-sm"
                                  title="Adjust stock"
                                >
                                  <TrendingDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditProduct(product)}
                                  className="btn-ghost btn-icon btn-sm"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Deactivate "${product.name}"?`)) {
                                      deleteMutation.mutate(product.id)
                                    }
                                  }}
                                  className="btn-danger btn-icon btn-sm"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <ProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
            setShowAddModal(false)
          }}
        />
      )}
      {editProduct && (
        <ProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
            setEditProduct(null)
          }}
        />
      )}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] })
            setAdjustProduct(null)
          }}
        />
      )}
    </div>
  )
}
