// src/app/api/inventory/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Category from '@/models/Category'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const cats = await Category.find().sort({ name: 1 }).lean()
  return NextResponse.json(cats.map(c => ({ ...c, id: (c as any)._id.toString() })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await req.json()
  const cat = await Category.create(body)
  return NextResponse.json({ ...cat.toObject(), id: cat._id.toString() }, { status: 201 })
}
