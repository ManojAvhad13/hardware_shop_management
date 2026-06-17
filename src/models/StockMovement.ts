// src/models/StockMovement.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE' | 'TRANSFER'
export type AlertType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY'

export interface IStockMovement extends Document {
  _id: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  type: MovementType
  quantity: number
  beforeStock: number
  afterStock: number
  reason?: string
  referenceId?: string
  createdAt: Date
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'TRANSFER'],
      required: true,
    },
    quantity: { type: Number, required: true },
    beforeStock: { type: Number, required: true },
    afterStock: { type: Number, required: true },
    reason: { type: String },
    referenceId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

StockMovementSchema.index({ productId: 1, createdAt: -1 })

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema)

// ── StockAlert ────────────────────────────────────────────────────────────────

export interface IStockAlert extends Document {
  _id: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  type: AlertType
  message: string
  isRead: boolean
  isSent: boolean
  createdAt: Date
}

const StockAlertSchema = new Schema<IStockAlert>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRY'], required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isSent: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const StockAlert: Model<IStockAlert> =
  mongoose.models.StockAlert ||
  mongoose.model<IStockAlert>('StockAlert', StockAlertSchema)
