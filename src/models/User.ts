// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose'

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'ACCOUNTANT'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  avatar?: string
  isActive: boolean
  pushToken?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT'], default: 'STAFF' },
    phone: { type: String, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    pushToken: { type: String },
  },
  { timestamps: true }
)

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export default User
