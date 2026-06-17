// src/app/api/notifications/unread-count/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Product from '@/models/Product'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const products = await Product.find({ isActive: true }, 'currentStock minStockLevel').lean()
  const lowStock = products.filter((p: any) => p.currentStock > 0 && p.currentStock <= p.minStockLevel).length
  const outOfStock = products.filter((p: any) => p.currentStock === 0).length

  return NextResponse.json({ count: lowStock + outOfStock, lowStock, outOfStock })
}
