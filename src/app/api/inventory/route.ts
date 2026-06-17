// src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Product from '@/models/Product'
import { StockMovement, StockAlert } from '@/models/StockMovement'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string(),
  supplierId: z.string().optional(),
  unit: z.string().default('piece'),
  costPrice: z.coerce.number().positive(),
  sellingPrice: z.coerce.number().positive(),
  mrp: z.coerce.number().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  currentStock: z.coerce.number().int().min(0).default(0),
  minStockLevel: z.coerce.number().int().min(0).default(10),
  maxStockLevel: z.coerce.number().int().min(0).default(1000),
  location: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const filter = searchParams.get('filter') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '25')

  const query: any = { isActive: true }
  if (search) query.$text = { $search: search }
  if (category) query.categoryId = category

  let products = await Product.find(query)
    .populate('categoryId', 'name color')
    .populate('supplierId', 'name')
    .sort({ name: 1 })
    .lean()

  // Apply stock filters after fetch
  if (filter === 'low-stock') {
    products = products.filter((p: any) => p.currentStock > 0 && p.currentStock <= p.minStockLevel)
  } else if (filter === 'out-of-stock') {
    products = products.filter((p: any) => p.currentStock === 0)
  }

  const total = products.length
  const paginated = products.slice((page - 1) * pageSize, page * pageSize)

  return NextResponse.json({
    data: paginated.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      categoryId: p.categoryId?._id?.toString() || p.categoryId,
      category: p.categoryId,
      supplier: p.supplierId,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (!['ADMIN', 'MANAGER'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const body = await req.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await Product.findOne({ sku: parsed.data.sku.toUpperCase() })
  if (existing) return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })

  const product = await Product.create(parsed.data)

  if (product.currentStock > 0) {
    await StockMovement.create({
      productId: product._id,
      type: 'ADJUSTMENT',
      quantity: product.currentStock,
      beforeStock: 0,
      afterStock: product.currentStock,
      reason: 'Initial stock entry',
    })
  }

  if (product.currentStock === 0) {
    await StockAlert.create({ productId: product._id, type: 'OUT_OF_STOCK', message: 'Product is out of stock' })
  } else if (product.currentStock <= product.minStockLevel) {
    await StockAlert.create({ productId: product._id, type: 'LOW_STOCK', message: `Stock (${product.currentStock}) at or below minimum (${product.minStockLevel})` })
  }

  return NextResponse.json({ ...product.toObject(), id: product._id.toString() }, { status: 201 })
}
