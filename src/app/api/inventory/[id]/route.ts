// src/app/api/inventory/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Product from '@/models/Product'
import { StockMovement, StockAlert } from '@/models/StockMovement'
import User from '@/models/User'
import { sendLowStockAlert, sendOutOfStockAlert } from '@/lib/notifications'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const product = await Product.findById(params.id)
    .populate('categoryId', 'name color icon')
    .populate('supplierId', 'name phone email')
    .lean()

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const movements = await StockMovement.find({ productId: params.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  return NextResponse.json({ ...product, id: (product as any)._id.toString(), stockMovements: movements })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (!['ADMIN', 'MANAGER'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()

  const existing = await Product.findById(params.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 1. EXTRACT movement-specific data so it DOES NOT pollute the Product update
  const { reason, type, quantity, currentStock, ...productUpdates } = body

  // Track stock change
  if (body.currentStock !== undefined && body.currentStock !== existing.currentStock) {
    await StockMovement.create({
      productId: existing._id,
      type: 'ADJUSTMENT',
      quantity: Math.abs(body.currentStock - existing.currentStock),
      beforeStock: existing.currentStock,
      afterStock: body.currentStock,
      reason: body.reason || 'Manual adjustment',
    })

    const users = await User.find({ isActive: true, pushToken: { $ne: null } }, 'pushToken').lean()
    const subs = users.map((u: any) => ({ token: u.pushToken }))

    if (body.currentStock === 0) {
      sendOutOfStockAlert(subs, existing.name).catch(console.error)
      await StockAlert.create({ productId: existing._id, type: 'OUT_OF_STOCK', message: `${existing.name} is out of stock` }).catch(() => { })
    } else if (body.currentStock <= (body.minStockLevel ?? existing.minStockLevel)) {
      sendLowStockAlert(subs, existing.name, body.currentStock, existing.minStockLevel).catch(console.error)
      await StockAlert.create({ productId: existing._id, type: 'LOW_STOCK', message: `${existing.name}: stock ${body.currentStock} ≤ min ${existing.minStockLevel}` }).catch(() => { })
    }
  }

  delete body.reason

  // 2. Safely update the product using ONLY valid product fields + currentStock
  const updated = await Product.findByIdAndUpdate(params.id, body, { new: true })
    .populate('categoryId', 'name color')
    .populate('supplierId', 'name')
    .lean()

  return NextResponse.json({ ...(updated as any), id: (updated as any)?._id.toString() })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  await Product.findByIdAndUpdate(params.id, { isActive: false })
  return NextResponse.json({ success: true })
}
