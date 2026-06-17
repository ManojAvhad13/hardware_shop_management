// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Supplier from '@/models/Supplier'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const query = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }] } : {}
  const suppliers = await Supplier.find(query).sort({ name: 1 }).lean()
  return NextResponse.json(suppliers.map(s => ({ ...s, id: (s as any)._id.toString() })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (!['ADMIN', 'MANAGER'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await connectDB()
  const body = await req.json()
  const supplier = await Supplier.create(body)
  return NextResponse.json({ ...supplier.toObject(), id: supplier._id.toString() }, { status: 201 })
}
