// src/app/api/billing/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const sale = await Sale.findById(params.id).lean()
  if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ...(sale as any), id: (sale as any)._id.toString() })
}
