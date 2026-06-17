// src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Expense, { ExpenseCategory } from '@/models/Expense'
import { z } from 'zod'

const schema = z.object({
  categoryId: z.string(),
  title: z.string().min(2),
  amount: z.coerce.number().positive(),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD']),
  date: z.string(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const query: any = {}
  if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { notes: { $regex: search, $options: 'i' } }]
  if (category) query.categoryId = category
  if (from || to) {
    query.date = {}
    if (from) query.date.$gte = new Date(from)
    if (to) query.date.$lte = new Date(to + 'T23:59:59')
  }

  const [expenses, total] = await Promise.all([
    Expense.find(query).sort({ date: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Expense.countDocuments(query),
  ])

  return NextResponse.json({
    data: expenses.map(e => ({ ...e, id: (e as any)._id.toString(), category: { name: (e as any).categoryName, color: (e as any).categoryColor } })),
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

  // Fetch category info to embed
  const cat = await ExpenseCategory.findById(parsed.data.categoryId)

  const expense = await Expense.create({
    ...parsed.data,
    date: new Date(parsed.data.date),
    categoryName: cat?.name,
    categoryColor: cat?.color,
  })

  return NextResponse.json({ ...expense.toObject(), id: expense._id.toString() }, { status: 201 })
}
