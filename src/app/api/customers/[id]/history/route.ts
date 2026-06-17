// src/app/api/customers/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongoose'
import Sale from '@/models/Sale'
import mongoose from 'mongoose'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()

  const customerId = new mongoose.Types.ObjectId(params.id)
  const [sales, totalAgg] = await Promise.all([
    Sale.find({ customerId, status: 'COMPLETED' })
      .sort({ saleDate: -1 })
      .limit(20)
      .select('invoiceNumber saleDate totalAmount paidAmount dueAmount paymentStatus items')
      .lean(),
    Sale.aggregate([
      { $match: { customerId, status: 'COMPLETED' } },
      { $group: { _id: null, totalPurchases: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' } } },
    ]),
  ])

  return NextResponse.json({
    sales: sales.map(s => ({ ...s, id: (s as any)._id.toString() })),
    totalPurchases: totalAgg[0]?.totalPurchases || 0,
    totalPaid: totalAgg[0]?.totalPaid || 0,
  })
}
