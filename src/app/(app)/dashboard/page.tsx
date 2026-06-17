'use client'
// src/app/(app)/dashboard/page.tsx
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Package, Users, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle, XCircle
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b']

function StatCard({
  title, value, sub, icon: Icon, color, trend, trendValue, href
}: {
  title: string; value: string; sub?: string; icon: any; color: string;
  trend?: 'up' | 'down'; trendValue?: string; href?: string
}) {
  const content = (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'badge-green', PARTIAL: 'badge-amber',
    PENDING: 'badge-blue', OVERDUE: 'badge-red',
  }
  return <span className={map[status] || 'badge-slate'}>{status}</span>
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => axios.get('/api/dashboard').then(r => r.data),
    refetchInterval: 120_000, // refresh every 2 min
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="card p-5 h-28 bg-slate-800/40" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const profitPositive = data.todayProfit >= 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title text-gradient">Good {getGreeting()}! 👋</h1>
          <p className="page-subtitle">Here's what's happening at your shop today.</p>
        </div>
        <p className="text-sm text-slate-500 hidden sm:block">{formatDateTime(new Date())}</p>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(data.todaySales)}
          sub={`${data.todayOrders} orders`}
          icon={ShoppingCart}
          color="bg-brand-500/20 text-brand-400"
        />
        <StatCard
          title="Today's Expenses"
          value={formatCurrency(data.todayExpenses)}
          icon={DollarSign}
          color="bg-red-500/20 text-red-400"
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(Math.abs(data.todayProfit))}
          sub={profitPositive ? 'Profitable day' : 'Loss today'}
          icon={profitPositive ? TrendingUp : TrendingDown}
          color={profitPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
        />
        <StatCard
          title="Outstanding Dues"
          value={formatCurrency(data.totalDue)}
          sub="Total receivables"
          icon={Clock}
          color="bg-amber-500/20 text-amber-400"
          href="/customers"
        />
        <StatCard
          title="Month Sales"
          value={formatCurrency(data.monthSales)}
          icon={TrendingUp}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          title="Month Profit"
          value={formatCurrency(data.monthProfit)}
          icon={TrendingUp}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          title="Low Stock Items"
          value={data.lowStockCount}
          sub={`${data.outOfStockCount} out of stock`}
          icon={AlertTriangle}
          color="bg-amber-500/20 text-amber-400"
          href="/inventory?filter=low-stock"
        />
        <StatCard
          title="Total Customers"
          value={data.totalCustomers}
          sub={`${data.totalProducts} products`}
          icon={Users}
          color="bg-teal-500/20 text-teal-400"
          href="/customers"
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart – 7 day trend */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-100">7-Day Trend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sales vs Expenses vs Profit</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.dailySalesChart} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [formatCurrency(v), '']}
              />
              <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2} fill="url(#gradSales)" name="Sales" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gradExp)" name="Expenses" />
              <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#gradProfit)" name="Profit" />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart – sales by category */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-100 mb-1">Sales by Category</h2>
          <p className="text-xs text-slate-500 mb-4">This month</p>
          {data.salesByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={data.salesByCategory}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {data.salesByCategory.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                    formatter={(v: number) => [formatCurrency(v), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {data.salesByCategory.slice(0, 5).map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color || COLORS[i % COLORS.length] }} />
                      <span className="text-slate-400">{cat.name}</span>
                    </div>
                    <span className="text-slate-300 font-medium">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
              No sales data this month
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h2 className="font-semibold text-slate-100">Recent Sales</h2>
            <Link href="/billing" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
          </div>
          <div className="divide-y divide-slate-700/30">
            {data.recentSales.length === 0 ? (
              <p className="text-center text-slate-500 py-10 text-sm">No sales yet today</p>
            ) : (
              data.recentSales.map((sale: any) => (
                <div key={sale.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-700/20 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {sale.customer?.name || 'Walk-in Customer'}
                    </p>
                    <p className="text-xs text-slate-500">{sale.invoiceNumber} · {sale.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">{formatCurrency(sale.totalAmount)}</p>
                    <PaymentStatusBadge status={sale.paymentStatus} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-100 mb-1">Payment Methods</h2>
          <p className="text-xs text-slate-500 mb-5">This month's collection</p>
          <div className="space-y-3">
            {data.paymentMethodBreakdown.length === 0 ? (
              <p className="text-slate-500 text-sm">No payment data</p>
            ) : (
              data.paymentMethodBreakdown
                .sort((a: any, b: any) => b.amount - a.amount)
                .map((item: any, i: number) => {
                  const total = data.paymentMethodBreakdown.reduce((s: number, p: any) => s + p.amount, 0)
                  const pct = total > 0 ? (item.amount / total * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{item.method}</span>
                        <span className="text-slate-300 font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-0.5">{pct.toFixed(0)}% · {item.count} transactions</p>
                    </div>
                  )
                })
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-700/50">
            <Link href="/billing/new" className="btn-primary w-full justify-center">
              <ShoppingCart className="w-4 h-4" />
              New Sale
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}
