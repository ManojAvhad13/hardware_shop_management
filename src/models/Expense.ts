// src/models/Expense.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IExpenseCategory extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  color: string
  createdAt: Date
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    color: { type: String, default: '#ef4444' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const ExpenseCategory: Model<IExpenseCategory> =
  mongoose.models.ExpenseCategory ||
  mongoose.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema)

// ── Expense ───────────────────────────────────────────────────────────────────

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId
  categoryId: mongoose.Types.ObjectId
  categoryName?: string
  categoryColor?: string
  title: string
  amount: number
  paymentMode: string
  date: Date
  notes?: string
  receipt?: string
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    categoryName: { type: String },
    categoryColor: { type: String },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD'],
      default: 'CASH',
    },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String },
    receipt: { type: String },
  },
  { timestamps: true }
)

ExpenseSchema.index({ date: -1 })
ExpenseSchema.index({ categoryId: 1 })

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)
export default Expense
