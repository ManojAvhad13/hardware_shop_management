// src/models/Supplier.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISupplier extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  phone?: string
  email?: string
  address?: string
  gstin?: string
  contactPerson?: string
  createdAt: Date
  updatedAt: Date
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    gstin: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
  },
  { timestamps: true }
)

const Supplier: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema)
export default Supplier
