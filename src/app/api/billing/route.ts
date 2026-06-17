// src/app/api/billing/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'
import Product from '@/models/Product'
import Customer from '@/models/Customer'
import { StockMovement } from '@/models/StockMovement'
import { generateInvoiceNumber } from '@/lib/utils'
import mongoose from 'mongoose'
import { z } from 'zod'

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  costPrice: z.number().positive(),
  taxRate: z.number().min(0).max(100),
  taxAmount: z.number().min(0),
  discount: z.number().min(0).default(0),
  totalPrice: z.number().positive(),
})

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  saleDate: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  totalAmount: z.number().positive(),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'CARD']).default('CASH'),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['DRAFT', 'COMPLETED']).default('COMPLETED'),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const paymentStatus = searchParams.get('paymentStatus') || ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const query: any = {}
  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerPhone: { $regex: search, $options: 'i' } },
    ]
  }
  if (paymentStatus) query.paymentStatus = paymentStatus
  if (from || to) {
    query.saleDate = {}
    if (from) query.saleDate.$gte = new Date(from)
    if (to) query.saleDate.$lte = new Date(to + 'T23:59:59')
  }

  const [sales, total] = await Promise.all([
    Sale.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Sale.countDocuments(query),
  ])

  return NextResponse.json({
    data: sales.map(s => ({ ...s, id: (s as any)._id.toString() })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const parsed = createSaleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const userId = (session.user as any).id
  const userName = session.user?.name || 'Unknown'
  const dueAmount = data.totalAmount - data.paidAmount

  let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING'
  if (dueAmount <= 0) paymentStatus = 'PAID'
  else if (data.paidAmount > 0) paymentStatus = 'PARTIAL'

  // Verify products & check stock
  const productIds = data.items.map(i => new mongoose.Types.ObjectId(i.productId))
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })

  for (const item of data.items) {
    const product = products.find(p => p._id.toString() === item.productId)
    if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 400 })
    if (product.currentStock < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${product.name}: have ${product.currentStock}, need ${item.quantity}` }, { status: 400 })
    }
  }

  // Fetch customer info
  let customerName: string | undefined
  let customerPhone: string | undefined
  if (data.customerId) {
    const cust = await Customer.findById(data.customerId)
    if (cust) { customerName = cust.name; customerPhone = cust.phone }
  }

  // Build sale items with product info embedded
  const saleItems = data.items.map(item => {
    const product = products.find(p => p._id.toString() === item.productId)!
    return {
      productId: new mongoose.Types.ObjectId(item.productId),
      productName: product.name,
      productSku: product.sku,
      productUnit: product.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: product.costPrice,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      discount: item.discount,
      totalPrice: item.totalPrice,
    }
  })

  // Create sale
  const sale = await Sale.create({
    invoiceNumber: generateInvoiceNumber(),
    customerId: data.customerId ? new mongoose.Types.ObjectId(data.customerId) : undefined,
    customerName,
    customerPhone,
    userId: new mongoose.Types.ObjectId(userId),
    userName,
    saleDate: data.saleDate ? new Date(data.saleDate) : new Date(),
    subtotal: data.subtotal,
    taxAmount: data.taxAmount,
    discountAmount: data.discountAmount,
    totalAmount: data.totalAmount,
    paidAmount: data.paidAmount,
    dueAmount: Math.max(0, dueAmount),
    paymentStatus,
    paymentMethod: data.paymentMethod,
    notes: data.notes || null,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    status: data.status,
    items: saleItems,
    payments: data.paidAmount > 0 ? [{
      amount: data.paidAmount,
      method: data.paymentMethod,
      paymentDate: new Date(),
    }] : [],
  })

  // Update stock levels
  await Promise.all(data.items.map(async (item) => {
    const product = products.find(p => p._id.toString() === item.productId)!
    const newStock = product.currentStock - item.quantity
    await Product.findByIdAndUpdate(item.productId, { currentStock: newStock })
    await StockMovement.create({
      productId: product._id,
      type: 'SALE',
      quantity: item.quantity,
      beforeStock: product.currentStock,
      afterStock: newStock,
      referenceId: sale._id.toString(),
      reason: `Sale ${sale.invoiceNumber}`,
    })
  }))

  // Update customer balance
  if (data.customerId && dueAmount > 0) {
    await Customer.findByIdAndUpdate(data.customerId, { $inc: { balance: dueAmount } })
  }

  return NextResponse.json({ ...sale.toObject(), id: sale._id.toString() }, { status: 201 })
}
