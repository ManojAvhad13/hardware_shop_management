// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'
import Expense from '@/models/Expense'
import Product from '@/models/Product'
import Customer from '@/models/Customer'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [todaySalesAgg, todayExpAgg, monthSalesAgg, monthExpAgg] = await Promise.all([
    Sale.aggregate([
      { $match: { saleDate: { $gte: todayStart, $lte: todayEnd }, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Sale.aggregate([
      { $match: { saleDate: { $gte: monthStart, $lte: monthEnd }, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ])

  const todaySales = todaySalesAgg[0]?.total || 0
  const todayOrders = todaySalesAgg[0]?.count || 0
  const todayExpenses = todayExpAgg[0]?.total || 0
  const monthSales = monthSalesAgg[0]?.total || 0
  const monthExpenses = monthExpAgg[0]?.total || 0

  // COGS today
  const todaySaleItems = await Sale.aggregate([
    { $match: { saleDate: { $gte: todayStart, $lte: todayEnd }, status: 'COMPLETED' } },
    { $unwind: '$items' },
    { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } } } },
  ])
  const todayCOGS = todaySaleItems[0]?.cogs || 0

  // Dues
  const dueAgg = await Sale.aggregate([
    { $match: { dueAmount: { $gt: 0 }, status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: '$dueAmount' } } },
  ])

  const [allProducts, totalCustomers] = await Promise.all([
    Product.find({ isActive: true }, 'currentStock minStockLevel'),
    Customer.countDocuments({ isActive: true }),
  ])

  const totalProducts = allProducts.length
  const lowStockCount = allProducts.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length
  const outOfStockCount = allProducts.filter(p => p.currentStock === 0).length

  // Recent sales
  const recentSales = await Sale.find({ status: 'COMPLETED' })
    .sort({ createdAt: -1 })
    .limit(8)
    .select('invoiceNumber customerName customerPhone totalAmount paymentStatus items saleDate')
    .lean()

  // 7-day chart
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, 6 - i))
  const dailySalesChart = await Promise.all(
    last7Days.map(async (day) => {
      const [sAgg, eAgg, cogsAgg] = await Promise.all([
        Sale.aggregate([
          { $match: { saleDate: { $gte: startOfDay(day), $lte: endOfDay(day) }, status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: startOfDay(day), $lte: endOfDay(day) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Sale.aggregate([
          { $match: { saleDate: { $gte: startOfDay(day), $lte: endOfDay(day) }, status: 'COMPLETED' } },
          { $unwind: '$items' },
          { $group: { _id: null, cogs: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } } } },
        ]),
      ])
      const salesAmt = sAgg[0]?.total || 0
      const expAmt = eAgg[0]?.total || 0
      const cogs = cogsAgg[0]?.cogs || 0
      return { date: format(day, 'dd MMM'), sales: salesAmt, expenses: expAmt + cogs, profit: salesAmt - cogs - expAmt }
    })
  )

  // Sales by category this month
  const catSales = await Sale.aggregate([
    { $match: { saleDate: { $gte: monthStart, $lte: monthEnd }, status: 'COMPLETED' } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$category.name',
        amount: { $sum: '$items.totalPrice' },
        color: { $first: '$category.color' },
      },
    },
    { $project: { name: '$_id', amount: 1, color: 1, _id: 0 } },
  ])

  // Payment method breakdown
  const paymentBreakdown = await Sale.aggregate([
    { $match: { saleDate: { $gte: monthStart, $lte: monthEnd }, status: 'COMPLETED' } },
    { $group: { _id: '$paymentMethod', amount: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
    { $project: { method: '$_id', amount: 1, count: 1, _id: 0 } },
  ])

  return NextResponse.json({
    todaySales,
    todayOrders,
    todayExpenses: todayExpenses + todayCOGS,
    todayProfit: todaySales - todayCOGS - todayExpenses,
    monthSales,
    monthExpenses,
    monthProfit: monthSales - monthExpenses,
    totalDue: dueAgg[0]?.total || 0,
    lowStockCount,
    outOfStockCount,
    totalProducts,
    totalCustomers,
    recentSales,
    salesByCategory: catSales,
    dailySalesChart,
    paymentMethodBreakdown: paymentBreakdown,
  })
}
