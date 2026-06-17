// src/app/api/billing/[id]/payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'
import Customer from '@/models/Customer'
import { z } from 'zod'

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'CARD']),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const sale = await Sale.findById(params.id)
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  if (parsed.data.amount > sale.dueAmount) {
    return NextResponse.json({ error: `Amount exceeds due amount of ₹${sale.dueAmount.toFixed(2)}` }, { status: 400 })
  }

  const newPaid = sale.paidAmount + parsed.data.amount
  const newDue = Math.max(0, sale.totalAmount - newPaid)
  const newStatus = newDue <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING'

  await Sale.findByIdAndUpdate(params.id, {
    $push: {
      payments: {
        amount: parsed.data.amount,
        method: parsed.data.method,
        referenceNo: parsed.data.referenceNo,
        notes: parsed.data.notes,
        paymentDate: new Date(),
      },
    },
    $set: { paidAmount: newPaid, dueAmount: newDue, paymentStatus: newStatus },
  })

  if (sale.customerId) {
    await Customer.findByIdAndUpdate(sale.customerId, { $inc: { balance: -parsed.data.amount } })
  }

  return NextResponse.json({ success: true })
}
