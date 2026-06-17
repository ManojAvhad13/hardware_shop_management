// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const body = await req.json()
  if (body.password && body.password.length >= 8) {
    body.password = await bcrypt.hash(body.password, 12)
  } else {
    delete body.password
  }

  const user = await User.findByIdAndUpdate(params.id, body, { new: true }).select('-password').lean()
  return NextResponse.json({ ...(user as any), id: (user as any)?._id.toString() })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await connectDB()
  await User.findByIdAndUpdate(params.id, { isActive: false })
  return NextResponse.json({ success: true })
}
