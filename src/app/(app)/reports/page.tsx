'use client'
// src/app/(app)/reports/page.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Download, BarChart3, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generatePLReportPDF, generateSalesReportPDF, generateInventoryReportPDF } from '@/lib/pdf-generator'

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'pl' | 'sales' | 'inventory'>('pl')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ['report-pl', fromDate, toDate],
    queryFn: () => axios.get('/api/reports/pl', { params: { from: fromDate, to: toDate } }).then(r => r.data),
    enabled: activeTab === 'pl',
  })

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', fromDate, toDate],
    queryFn: () => axios.get('/api/reports/sales', { params: { from: fromDate, to: toDate } }).then(r => r.data),
    enabled: activeTab === 'sales',
  })

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => axios.get('/api/reports/inventory').then(r => r.data),
    enabled: activeTab === 'inventory',
  })

  const exportPL = async () => {
    if (!plData) return
    try {
      const pdf = generatePLReportPDF({ ...plData, from: fromDate, to: toDate })
      pdf.save(`pl-report-${fromDate}-to-${toDate}.pdf`)
      toast.success('P&L report exported!')
    } catch { toast.error('Export failed') }
  }

  const exportSales = async () => {
    if (!salesData) return
    try {
      const pdf = generateSalesReportPDF({ ...salesData, from: fromDate, to: toDate })
      pdf.save(`sales-report-${fromDate}-to-${toDate}.pdf`)
      toast.success('Sales report exported!')
    } catch { toast.error('Export failed') }
  }

  const exportInventory = async () => {
    if (!invData) return
    try {
      const pdf = generateInventoryReportPDF(invData.products)
      pdf.save(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Inventory report exported!')
    } catch { toast.error('Export failed') }
  }

  const tabs = [
    { id: 'pl', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'sales', label: 'Sales Report', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory Report', icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Business analytics and export to PDF</p>
        </div>
      </div>

      {/* Date range (for sales/pl) */}
      {activeTab !== 'inventory' && (
        <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-3 flex-1">
            <div>
              <label className="label">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" />
            </div>
          </div>
          {/* Quick ranges */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Today', days: 0 },
              { label: 'Week', days: 7 },
              { label: 'Month', days: 30 },
              { label: '3 Months', days: 90 },
            ].map(r => (
              <button
                key={r.label}
                onClick={() => {
                  const to = new Date()
                  const from = new Date()
                  from.setDate(from.getDate() - r.days)
                  setFromDate(from.toISOString().slice(0, 10))
                  setToDate(to.toISOString().slice(0, 10))
                }}
                className="btn-ghost btn-sm"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── P&L Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'pl' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={exportPL} disabled={!plData} className="btn-secondary btn-sm">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>

          {plLoading ? (
            <div className="card p-10 text-center text-slate-500">Loading P&L data...</div>
          ) : plData ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', value: formatCurrency(plData.totalRevenue), color: 'text-brand-400', bg: 'bg-brand-500/10' },
                  { label: 'Cost of Goods (COGS)', value: formatCurrency(plData.totalCOGS), color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Gross Profit', value: formatCurrency(plData.grossProfit), color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Net Profit', value: formatCurrency(plData.netProfit), color: plData.netProfit >= 0 ? 'text-green-400' : 'text-red-400', bg: plData.netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
                ].map(s => (
                  <div key={s.label} className={`card p-5 ${s.bg}`}>
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
                    {s.label === 'Net Profit' && plData.totalRevenue > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Margin: {((plData.netProfit / plData.totalRevenue) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Expense bar */}
                <div className="card p-6">
                  <h3 className="font-semibold text-slate-100 mb-4">Revenue vs Expenses</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={plData.monthlyBreakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                        formatter={(v: number) => [formatCurrency(v), '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                      <Bar dataKey="revenue" fill="#f97316" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Expense breakdown pie */}
                <div className="card p-6">
                  <h3 className="font-semibold text-slate-100 mb-4">Expense Breakdown</h3>
                  {plData.expenseBreakdown?.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={plData.expenseBreakdown} dataKey="amount" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                            {plData.expenseBreakdown.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                            formatter={(v: number) => [formatCurrency(v), '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {plData.expenseBreakdown.map((e: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-slate-400">{e.category}</span>
                            </div>
                            <span className="text-slate-300">{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-10">No expense data</p>
                  )}
                </div>
              </div>

              {/* Category breakdown table */}
              {plData.salesByCategory?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700/50">
                    <h3 className="font-semibold text-slate-100">Sales by Category</h3>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th className="text-right">Sales</th>
                          <th className="text-right">COGS</th>
                          <th className="text-right">Gross Profit</th>
                          <th className="text-right">Margin %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plData.salesByCategory.map((cat: any, i: number) => (
                          <tr key={i}>
                            <td className="text-slate-200">{cat.category}</td>
                            <td className="text-right text-slate-300">{formatCurrency(cat.sales)}</td>
                            <td className="text-right text-slate-400">{formatCurrency(cat.cogs)}</td>
                            <td className="text-right font-semibold text-green-400">{formatCurrency(cat.profit)}</td>
                            <td className="text-right">
                              <span className={`badge ${cat.margin >= 20 ? 'badge-green' : cat.margin >= 10 ? 'badge-amber' : 'badge-red'}`}>
                                {cat.margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Sales Tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={exportSales} disabled={!salesData} className="btn-secondary btn-sm">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>

          {salesLoading ? (
            <div className="card p-10 text-center text-slate-500">Loading sales data...</div>
          ) : salesData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Invoices', value: salesData.sales?.length || 0 },
                  { label: 'Total Sales', value: formatCurrency(salesData.totalSales) },
                  { label: 'Total Tax (GST)', value: formatCurrency(salesData.totalTax) },
                  { label: 'Outstanding', value: formatCurrency(salesData.totalDue) },
                ].map(s => (
                  <div key={s.label} className="card p-4">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-slate-100">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Daily chart */}
              <div className="card p-6">
                <h3 className="font-semibold text-slate-100 mb-4">Daily Sales Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={salesData.dailyChart || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                      formatter={(v: number) => [formatCurrency(v), '']}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} dot={false} name="Sales" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top customers */}
              {salesData.topCustomers?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700/50">
                    <h3 className="font-semibold text-slate-100">Top Customers</h3>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th className="text-right">Orders</th>
                          <th className="text-right">Total Purchase</th>
                          <th className="text-right">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.topCustomers.map((c: any, i: number) => (
                          <tr key={i}>
                            <td className="text-slate-200">{c.name || 'Walk-in'}</td>
                            <td className="text-right text-slate-400">{c.orders}</td>
                            <td className="text-right font-semibold text-slate-100">{formatCurrency(c.total)}</td>
                            <td className={`text-right ${c.due > 0 ? 'text-amber-400' : 'text-green-400'}`}>{formatCurrency(c.due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Inventory Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={exportInventory} disabled={!invData} className="btn-secondary btn-sm">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>

          {invLoading ? (
            <div className="card p-10 text-center text-slate-500">Loading inventory data...</div>
          ) : invData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Products', value: invData.total },
                  { label: 'Inventory Value', value: formatCurrency(invData.totalValue) },
                  { label: 'Low Stock Items', value: invData.lowStock },
                  { label: 'Out of Stock', value: invData.outOfStock },
                ].map(s => (
                  <div key={s.label} className="card p-4">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-slate-100">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-700/50">
                  <h3 className="font-semibold text-slate-100">Stock Status Summary</h3>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th className="text-right">Stock</th>
                        <th className="text-right">Min</th>
                        <th className="text-right">Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invData.products?.map((p: any) => {
                        const isOut = p.currentStock === 0
                        const isLow = !isOut && p.currentStock <= p.minStockLevel
                        return (
                          <tr key={p.id}>
                            <td className="font-mono text-xs text-slate-400">{p.sku}</td>
                            <td className="text-slate-200">{p.name}</td>
                            <td>
                              <span className="badge" style={{ background: p.category?.color + '20', color: p.category?.color, borderColor: p.category?.color + '40' }}>
                                {p.category?.name}
                              </span>
                            </td>
                            <td className={`text-right font-semibold ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-200'}`}>
                              {p.currentStock}
                            </td>
                            <td className="text-right text-slate-400">{p.minStockLevel}</td>
                            <td className="text-right text-slate-300">{formatCurrency(p.currentStock * p.costPrice)}</td>
                            <td>
                              <span className={`badge ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-green'}`}>
                                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'OK'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
