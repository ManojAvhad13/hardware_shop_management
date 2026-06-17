// src/app/api/expenses/categories/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import { ExpenseCategory } from '@/models/Expense'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const cats = await ExpenseCategory.find().sort({ name: 1 }).lean()
  return NextResponse.json(cats.map(c => ({ ...c, id: (c as any)._id.toString() })))
}
