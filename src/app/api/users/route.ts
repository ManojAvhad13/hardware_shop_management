// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT']),
  phone: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const users = await User.find({}, '-password').sort({ createdAt: 1 }).lean()
  return NextResponse.json(users.map(u => ({ ...u, id: (u as any)._id.toString() })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await connectDB()

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await User.findOne({ email: parsed.data.email })
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const hashed = await bcrypt.hash(parsed.data.password, 12)
  const user = await User.create({ ...parsed.data, password: hashed })

  return NextResponse.json({
    id: user._id.toString(), name: user.name, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive,
  }, { status: 201 })
}
