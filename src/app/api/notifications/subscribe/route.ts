// src/app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const subscription = await req.json()
  const userId = (session.user as any).id
  await User.findByIdAndUpdate(userId, { pushToken: JSON.stringify(subscription) })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  await User.findByIdAndUpdate((session.user as any).id, { pushToken: null })
  return NextResponse.json({ success: true })
}
