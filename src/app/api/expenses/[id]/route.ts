// src/app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Expense from '@/models/Expense'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await req.json()
  if (body.date) body.date = new Date(body.date)
  const expense = await Expense.findByIdAndUpdate(params.id, body, { new: true }).lean()
  return NextResponse.json({ ...(expense as any), id: (expense as any)?._id.toString() })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (!['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await connectDB()
  await Expense.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
