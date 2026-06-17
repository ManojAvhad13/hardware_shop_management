// src/types/index.ts

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF' | 'ACCOUNTANT'
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT' | 'CARD'
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'RETURNED'
export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE' | 'TRANSFER'
export type AlertType = 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'EXPIRY'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string
  avatar?: string
  isActive: boolean
  createdAt: Date
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode?: string
  description?: string
  categoryId: string
  supplierId?: string
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
  category?: Category
  supplier?: Supplier
  createdAt: Date
}

export interface Category {
  id: string
  name: string
  description?: string
  color: string
  icon: string
}

export interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  gstin?: string
  contactPerson?: string
}

export interface Customer {
  id: string
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
}

export interface SaleItem {
  id?: string
  productId: string
  product?: Product
  quantity: number
  unitPrice: number
  costPrice: number
  taxRate: number
  taxAmount: number
  discount: number
  totalPrice: number
}

export interface Sale {
  id: string
  invoiceNumber: string
  customerId?: string
  customer?: Customer
  userId: string
  user?: User
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
  items: SaleItem[]
  createdAt: Date
}

export interface Expense {
  id: string
  categoryId: string
  category?: ExpenseCategory
  title: string
  amount: number
  paymentMode: PaymentMethod
  date: Date
  notes?: string
  receipt?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  color: string
}

export interface DashboardStats {
  todaySales: number
  todayExpenses: number
  todayProfit: number
  monthSales: number
  monthExpenses: number
  monthProfit: number
  totalDue: number
  lowStockCount: number
  outOfStockCount: number
  totalCustomers: number
  totalProducts: number
  recentSales: Sale[]
  salesByCategory: { category: string; amount: number; color: string }[]
  dailySalesChart: { date: string; sales: number; expenses: number; profit: number }[]
  paymentMethodBreakdown: { method: string; amount: number; count: number }[]
}

export interface StockAlert {
  id: string
  productId: string
  product?: Product
  type: AlertType
  message: string
  isRead: boolean
  createdAt: Date
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
