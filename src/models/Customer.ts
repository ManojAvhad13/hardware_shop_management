// src/models/Customer.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  phone: string
  email?: string
  address?: string
  gstin?: string
  creditLimit: number
  balance: number
  notes?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    gstin: { type: String, trim: true },
    creditLimit: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

CustomerSchema.index({ name: 'text', phone: 'text' })
CustomerSchema.index({ balance: -1 })

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)
export default Customer
