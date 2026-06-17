// src/models/PaymentReminder.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPaymentReminder extends Document {
  _id: mongoose.Types.ObjectId
  customerId?: mongoose.Types.ObjectId
  saleId?: mongoose.Types.ObjectId
  message: string
  sentAt?: Date
  scheduledAt: Date
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  type: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH'
  createdAt: Date
}

const PaymentReminderSchema = new Schema<IPaymentReminder>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale' },
    message: { type: String, required: true },
    sentAt: { type: Date },
    scheduledAt: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'CANCELLED'], default: 'PENDING' },
    type: { type: String, enum: ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'], default: 'SMS' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const PaymentReminder: Model<IPaymentReminder> =
  mongoose.models.PaymentReminder ||
  mongoose.model<IPaymentReminder>('PaymentReminder', PaymentReminderSchema)
export default PaymentReminder
