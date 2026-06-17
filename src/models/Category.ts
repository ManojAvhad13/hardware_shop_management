// src/models/Category.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description?: string
  color: string
  icon: string
  createdAt: Date
  updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: 'package' },
  },
  { timestamps: true }
)

const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema)
export default Category
