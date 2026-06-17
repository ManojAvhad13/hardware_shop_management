// src/app/api/reports/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Product from '@/models/Product'

export async function GET(_: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const products = await Product.find({ isActive: true })
    .populate('categoryId', 'name color')
    .sort({ name: 1 })
    .lean()

  const mapped = products.map((p: any) => ({
    ...p,
    id: p._id.toString(),
    category: p.categoryId,
  }))

  const totalValue = mapped.reduce((s, p: any) => s + p.currentStock * p.costPrice, 0)
  const lowStock = mapped.filter((p: any) => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length
  const outOfStock = mapped.filter((p: any) => p.currentStock === 0).length

  return NextResponse.json({ products: mapped, total: mapped.length, totalValue, lowStock, outOfStock })
}
