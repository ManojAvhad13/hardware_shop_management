// src/app/api/reports/sales/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'
import { eachDayOfInterval, startOfDay, endOfDay, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')! + 'T23:59:59') : new Date()

  const sales = await Sale.find({ saleDate: { $gte: from, $lte: to }, status: 'COMPLETED' })
    .sort({ saleDate: 1 })
    .lean()

  const totalSales = sales.reduce((s, sale) => s + sale.subtotal, 0)
  const totalTax = sales.reduce((s, sale) => s + sale.taxAmount, 0)
  const totalDiscount = sales.reduce((s, sale) => s + sale.discountAmount, 0)
  const grandTotal = sales.reduce((s, sale) => s + sale.totalAmount, 0)
  const totalDue = sales.reduce((s, sale) => s + sale.dueAmount, 0)

  // Daily chart
  const days = eachDayOfInterval({ start: from, end: to })
  const dailyChart = days.map(day => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    const daySales = sales.filter(s => new Date(s.saleDate) >= dayStart && new Date(s.saleDate) <= dayEnd)
    return { date: format(day, 'dd MMM'), amount: daySales.reduce((s, sale) => s + sale.totalAmount, 0), count: daySales.length }
  })

  // Top customers
  const custMap = new Map<string, { name: string; orders: number; total: number; due: number }>()
  sales.forEach(sale => {
    const key = sale.customerId?.toString() || 'walkin'
    const name = sale.customerName || 'Walk-in'
    const ex = custMap.get(key) || { name, orders: 0, total: 0, due: 0 }
    custMap.set(key, { name, orders: ex.orders + 1, total: ex.total + sale.totalAmount, due: ex.due + sale.dueAmount })
  })
  const topCustomers = Array.from(custMap.values()).sort((a, b) => b.total - a.total).slice(0, 10)

  return NextResponse.json({
    sales: sales.map(s => ({ ...s, id: (s as any)._id.toString() })),
    totalSales, totalTax, totalDiscount, grandTotal, totalDue, dailyChart, topCustomers,
  })
}
