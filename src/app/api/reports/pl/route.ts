// src/app/api/reports/pl/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'
import Expense from '@/models/Expense'
import { startOfMonth, subMonths, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : subMonths(new Date(), 1)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')! + 'T23:59:59') : new Date()

  // Revenue
  const revenueAgg = await Sale.aggregate([
    { $match: { saleDate: { $gte: from, $lte: to }, status: 'COMPLETED' } },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
  ])
  const totalRevenue = revenueAgg[0]?.totalRevenue || 0

  // COGS
  const cogsAgg = await Sale.aggregate([
    { $match: { saleDate: { $gte: from, $lte: to }, status: 'COMPLETED' } },
    { $unwind: '$items' },
    { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } } } },
  ])
  const totalCOGS = cogsAgg[0]?.cogs || 0
  const grossProfit = totalRevenue - totalCOGS

  // Expenses
  const expAgg = await Expense.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: '$categoryName', amount: { $sum: '$amount' } } },
    { $project: { category: '$_id', amount: 1, _id: 0 } },
  ])
  const totalExpenses = expAgg.reduce((s, e) => s + e.amount, 0)
  const netProfit = grossProfit - totalExpenses

  // Sales by category
  const catAgg = await Sale.aggregate([
    { $match: { saleDate: { $gte: from, $lte: to }, status: 'COMPLETED' } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories', localField: 'product.categoryId', foreignField: '_id', as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$category.name',
        sales: { $sum: '$items.totalPrice' },
        cogs: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } },
      },
    },
    {
      $project: {
        category: { $ifNull: ['$_id', 'Uncategorized'] },
        sales: 1, cogs: 1,
        profit: { $subtract: ['$sales', '$cogs'] },
        margin: {
          $cond: [{ $eq: ['$sales', 0] }, 0, { $multiply: [{ $divide: [{ $subtract: ['$sales', '$cogs'] }, '$sales'] }, 100] }],
        },
        _id: 0,
      },
    },
    { $sort: { sales: -1 } },
  ])

  // Monthly breakdown (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
  const monthlyBreakdown = await Promise.all(
    months.map(async (month) => {
      const mFrom = startOfMonth(month)
      const mTo = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
      const [sAgg, eAgg] = await Promise.all([
        Sale.aggregate([{ $match: { saleDate: { $gte: mFrom, $lte: mTo }, status: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
        Expense.aggregate([{ $match: { date: { $gte: mFrom, $lte: mTo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ])
      return { month: format(month, 'MMM yy'), revenue: sAgg[0]?.total || 0, expenses: eAgg[0]?.total || 0 }
    })
  )

  return NextResponse.json({
    totalRevenue,
    totalCOGS,
    grossProfit,
    totalExpenses,
    netProfit,
    expenseBreakdown: expAgg,
    salesByCategory: catAgg,
    monthlyBreakdown,
  })
}
