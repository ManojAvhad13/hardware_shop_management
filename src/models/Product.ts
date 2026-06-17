// src/models/Product.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  sku: string
  barcode?: string
  description?: string
  categoryId: mongoose.Types.ObjectId
  supplierId?: mongoose.Types.ObjectId
  unit: string
  costPrice: number
  sellingPrice: number
  mrp?: number
  taxRate: number
  currentStock: number
  minStockLevel: number
  maxStockLevel: number
  location?: string
  imageUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    description: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    unit: { type: String, default: 'piece', trim: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    currentStock: { type: Number, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 10, min: 0 },
    maxStockLevel: { type: Number, default: 1000, min: 0 },
    location: { type: String, trim: true },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Indexes for fast search
ProductSchema.index({ name: 'text', sku: 'text', barcode: 'text' })
ProductSchema.index({ categoryId: 1 })
ProductSchema.index({ isActive: 1, currentStock: 1 })

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)
export default Product
