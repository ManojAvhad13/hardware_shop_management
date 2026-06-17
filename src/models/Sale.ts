// src/models/Sale.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'CARD'
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'RETURNED'

export interface ISaleItem {
  productId: mongoose.Types.ObjectId
  productName: string
  productSku: string
  productUnit: string
  quantity: number
  unitPrice: number
  costPrice: number
  taxRate: number
  taxAmount: number
  discount: number
  totalPrice: number
}

export interface IPaymentRecord {
  _id?: mongoose.Types.ObjectId
  amount: number
  method: PaymentMethod
  referenceNo?: string
  notes?: string
  paymentDate: Date
}

export interface ISale extends Document {
  _id: mongoose.Types.ObjectId
  invoiceNumber: string
  customerId?: mongoose.Types.ObjectId
  customerName?: string
  customerPhone?: string
  userId: mongoose.Types.ObjectId
  userName: string
  saleDate: Date
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  notes?: string
  status: SaleStatus
  dueDate?: Date
  items: ISaleItem[]
  payments: IPaymentRecord[]
  createdAt: Date
  updatedAt: Date
}

const SaleItemSchema = new Schema<ISaleItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  productUnit: { type: String, default: 'piece' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
}, { _id: true })

const PaymentRecordSchema = new Schema<IPaymentRecord>({
  amount: { type: Number, required: true },
  method: { type: String, enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'CARD'] },
  referenceNo: { type: String },
  notes: { type: String },
  paymentDate: { type: Date, default: Date.now },
}, { _id: true })

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    customerPhone: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    saleDate: { type: Date, default: Date.now },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'PENDING', 'OVERDUE'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT', 'CARD'],
      default: 'CASH',
    },
    notes: { type: String },
    status: { type: String, enum: ['DRAFT', 'COMPLETED', 'CANCELLED', 'RETURNED'], default: 'COMPLETED' },
    dueDate: { type: Date },
    items: [SaleItemSchema],
    payments: [PaymentRecordSchema],
  },
  { timestamps: true }
)

// SaleSchema.index({ invoiceNumber: 1 })
SaleSchema.index({ customerId: 1, saleDate: -1 })
SaleSchema.index({ saleDate: -1 })
SaleSchema.index({ paymentStatus: 1 })
SaleSchema.index({ status: 1 })

const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)
export default Sale
