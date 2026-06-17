// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9000 + 1000)
  return `INV-${year}${month}-${random}`
}

export function generateBillNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9000 + 1000)
  return `PO-${year}${month}-${random}`
}

export function getStockStatus(current: number, min: number) {
  if (current === 0) return { label: 'Out of Stock', color: 'red', variant: 'destructive' as const }
  if (current <= min) return { label: 'Low Stock', color: 'amber', variant: 'warning' as const }
  return { label: 'In Stock', color: 'green', variant: 'success' as const }
}

export function calculateTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export const ROLE_PERMISSIONS = {
  ADMIN:      ['read', 'write', 'delete', 'manage_users', 'view_reports', 'manage_settings'],
  MANAGER:    ['read', 'write', 'delete', 'view_reports'],
  ACCOUNTANT: ['read', 'view_reports', 'manage_expenses'],
  STAFF:      ['read', 'write'],
} as const

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? []
  return perms.includes(permission as any)
}
