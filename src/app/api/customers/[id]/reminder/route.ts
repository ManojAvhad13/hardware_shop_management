// src/app/api/customers/[id]/reminder/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import PaymentReminder from '@/models/PaymentReminder'
import mongoose from 'mongoose'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { type, message } = await req.json()

  await PaymentReminder.create({
    customerId: new mongoose.Types.ObjectId(params.id),
    message,
    scheduledAt: new Date(),
    type,
    status: 'PENDING',
  })

  return NextResponse.json({ success: true, message: 'Reminder recorded. Configure Twilio for actual sending.' })
}
