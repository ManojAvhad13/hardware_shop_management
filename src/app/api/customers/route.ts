// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Customer from '@/models/Customer'
import Sale from '@/models/Sale'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const withDue = searchParams.get('withDue') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const query: any = { isActive: true }
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }]
  if (withDue) query.balance = { $gt: 0 }

  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ balance: -1, name: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Customer.countDocuments(query),
  ])

  // Get sale counts per customer
  const customerIds = customers.map((c: any) => c._id)
  const saleCounts = await Sale.aggregate([
    { $match: { customerId: { $in: customerIds } } },
    { $group: { _id: '$customerId', count: { $sum: 1 } } },
  ])
  const saleCountMap = new Map(saleCounts.map(s => [s._id.toString(), s.count]))

  return NextResponse.json({
    data: customers.map((c: any) => ({
      ...c,
      id: c._id.toString(),
      salesCount: saleCountMap.get(c._id.toString()) || 0,
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

  await connectDB()
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await Customer.findOne({ phone: parsed.data.phone })
  if (existing) return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 })

  const customer = await Customer.create({ ...parsed.data, email: parsed.data.email || undefined })
  return NextResponse.json({ ...customer.toObject(), id: customer._id.toString() }, { status: 201 })
}
