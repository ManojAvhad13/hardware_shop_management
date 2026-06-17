'use client'
// src/app/(app)/billing/new/page.tsx
import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  ChevronDown, Printer, Save, X, Package
} from 'lucide-react'
import { formatCurrency, debounce } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/pdf-generator'
import { useSession } from 'next-auth/react'

interface CartItem {
  productId: string
  name: string
  sku: string
  unit: string
  quantity: number
  unitPrice: number
  costPrice: number
  taxRate: number
  taxAmount: number
  discount: number
  totalPrice: number
}

export default function NewBillingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const qc = useQueryClient()

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDrop, setShowCustomerDrop] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDrop, setShowProductDrop] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState(0)

  const debouncedProductSearch = useCallback(debounce(setProductSearch, 300), [])
  const debouncedCustomerSearch = useCallback(debounce(setCustomerSearch, 300), [])

  const { data: products } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: () => axios.get('/api/inventory', { params: { search: productSearch, pageSize: 50 } }).then(r => r.data.data),
    // enabled: productSearch.length >= 1,
    enabled: true,
  })

  const { data: customers } = useQuery({
    queryKey: ['customer-search', customerSearch],
    queryFn: () => axios.get('/api/customers', { params: { search: customerSearch, pageSize: 8 } }).then(r => r.data.data),
    enabled: customerSearch.length >= 1,
  })

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast.error(`Only ${product.currentStock} in stock`)
          return prev
        }
        return prev.map(i => i.productId === product.id
          ? updateItemCalc({ ...i, quantity: i.quantity + 1 })
          : i
        )
      }
      const item: CartItem = updateItemCalc({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: 1,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        taxRate: product.taxRate,
        taxAmount: 0,
        discount: 0,
        totalPrice: 0,
      })
      return [...prev, item]
    })
    setShowProductDrop(false)
    setProductSearch('')
  }

  const updateItemCalc = (item: CartItem): CartItem => {
    const basePrice = item.unitPrice * item.quantity
    const discountAmt = (basePrice * item.discount) / 100
    const taxableAmt = basePrice - discountAmt
    const taxAmount = (taxableAmt * item.taxRate) / 100
    const totalPrice = taxableAmt + taxAmount
    return { ...item, taxAmount, totalPrice }
  }

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return }
    setCart(prev => prev.map(i => i.productId === productId ? updateItemCalc({ ...i, quantity: qty }) : i))
  }

  const updatePrice = (productId: string, price: number) => {
    setCart(prev => prev.map(i => i.productId === productId ? updateItemCalc({ ...i, unitPrice: price }) : i))
  }

  const updateDiscount = (productId: string, disc: number) => {
    setCart(prev => prev.map(i => i.productId === productId ? updateItemCalc({ ...i, discount: disc }) : i))
  }

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const totalDiscount = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.discount / 100), 0) + globalDiscount
  const totalTax = cart.reduce((s, i) => s + i.taxAmount, 0)
  const totalAmount = Math.max(0, subtotal - totalDiscount + totalTax)
  const paid = parseFloat(paidAmount) || 0
  const change = paid - totalAmount

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/billing', data),
    onSuccess: async (res) => {
      toast.success(`Invoice ${res.data.invoiceNumber} created!`)
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      router.push('/billing')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create invoice')
    },
  })

  const handleSubmit = (status: 'COMPLETED' | 'DRAFT' = 'COMPLETED') => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    createSaleMutation.mutate({
      customerId: selectedCustomer?.id,
      items: cart.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice,
        taxRate: i.taxRate,
        taxAmount: i.taxAmount,
        discount: i.discount,
        totalPrice: i.totalPrice,
      })),
      subtotal,
      taxAmount: totalTax,
      discountAmount: totalDiscount,
      totalAmount,
      paidAmount: Math.min(paid, totalAmount),
      paymentMethod,
      notes,
      status,
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
      {/* ── Left: Product search + Cart ────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="page-header">
          <div>
            <h1 className="page-title">New Sale</h1>
            <p className="page-subtitle">Add products and process payment</p>
          </div>
        </div>

        {/* Product search */}
        <div className="card p-4">
          <div className="relative">
            {/* <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /> */}
            <Search className="absolute left-3.5 top-5 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              className="input pl-10 text-base"
              // onChange={e => { debouncedProductSearch(e.target.value); setShowProductDrop(true) }}
              onChange={(e) => {
                setProductSearch(e.target.value)
                setShowProductDrop(true)
              }}
              onFocus={() => setShowProductDrop(true)}
              autoFocus
            />
            {showProductDrop && products && products.length > 0 && (
              <div className="mt-2 card shadow-2xl z-50 max-h-72 overflow-y-auto p-2 grid grid-cols-2 gap-2">
                {products.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    // className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors text-left border-b border-slate-700/30 last:border-0"
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/40 transition-colors text-left border border-slate-700/30 rounded-lg"
                  >
                    <div className="w-9 h-9 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.sku} · Stock: {product.currentStock} {product.unit}s</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-brand-400">{formatCurrency(product.sellingPrice)}</p>
                      <p className="text-xs text-slate-500">{product.taxRate}% GST</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Cart */}
        <div className="card overflow-hidden">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Cart is empty — search and add products</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-300">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear all
                </button>
              </div>
              <div className="divide-y divide-slate-700/30">
                {cart.map(item => (
                  <div key={item.productId} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.sku}</p>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="text-slate-500 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      {/* Qty */}
                      <div>
                        <label className="label">Qty</label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                            className="input text-center px-1 w-14"
                            min="1"
                          />
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="label">Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                          className="input"
                          step="0.01"
                        />
                      </div>

                      {/* Discount */}
                      <div>
                        <label className="label">Disc %</label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={e => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                          className="input"
                          min="0" max="100" step="0.5"
                        />
                      </div>

                      {/* Total */}
                      <div>
                        <label className="label">Total</label>
                        <div className="h-[42px] flex items-center">
                          <span className="text-base font-bold text-brand-400">{formatCurrency(item.totalPrice)}</span>
                          {item.taxAmount > 0 && (
                            <span className="text-xs text-slate-500 ml-2">+{formatCurrency(item.taxAmount)} GST</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Summary panel ─────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Customer */}
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Customer</p>
          {
            selectedCustomer ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                  {selectedCustomer.balance > 0 && (
                    <p className="text-xs text-amber-400">Due: {formatCurrency(selectedCustomer.balance)}</p>
                  )}
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-slate-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  className="input pl-10"
                  onChange={e => { debouncedCustomerSearch(e.target.value); setShowCustomerDrop(true) }}
                  onFocus={() => setShowCustomerDrop(true)}
                />
                {showCustomerDrop && customers && customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 card shadow-2xl z-50">
                    {customers.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/40 text-left border-b border-slate-700/30 last:border-0"
                      >
                        <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-200">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }
        </div >

        {/* Bill Summary */}
        < div className="card p-5 space-y-3" >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bill Summary</p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax (GST)</span>
              <span>+{formatCurrency(totalTax)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
          </div>

          {/* Global discount */}
          <div>
            <label className="label">Additional Discount (₹)</label>
            <input
              type="number"
              value={globalDiscount || ''}
              onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
              className="input"
              placeholder="0.00"
              min="0"
            />
          </div>

          <div className="border-t border-slate-700/50 pt-3 flex justify-between items-center">
            <span className="font-semibold text-slate-200">Total</span>
            <span className="text-2xl font-display font-bold text-brand-400">{formatCurrency(totalAmount)}</span>
          </div>
        </div >

        {/* Payment */}
        < div className="card p-5 space-y-3" >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Payment</p>

          <div>
            <label className="label">Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="select">
              {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'].map(m => (
                <option key={m} value={m}>{m.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Amount Paid (₹)</label>
              <button
                type="button"
                onClick={() => setPaidAmount(totalAmount.toFixed(2))}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Full amount
              </button>
            </div>
            <input
              type="number"
              value={paidAmount}
              onChange={e => setPaidAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {
            paid > 0 && (
              <div className={`flex justify-between text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                <span>{change >= 0 ? 'Change' : 'Due'}</span>
                <span>{formatCurrency(Math.abs(change))}</span>
              </div>
            )
          }

          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="textarea"
              placeholder="Optional notes..."
            />
          </div>
        </div >

        {/* Actions */}
        < div className="space-y-2" >
          <button
            onClick={() => handleSubmit('COMPLETED')}
            disabled={cart.length === 0 || createSaleMutation.isPending}
            className="btn-primary w-full btn-lg"
          >
            <ShoppingCart className="w-5 h-5" />
            {createSaleMutation.isPending ? 'Processing...' : `Confirm Sale — ${formatCurrency(totalAmount)}`}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSubmit('DRAFT')}
              disabled={cart.length === 0 || createSaleMutation.isPending}
              className="btn-secondary w-full"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button onClick={() => router.push('/billing')} className="btn-ghost w-full">
              Cancel
            </button>
          </div>
        </div >
      </div >
    </div >
  )
}
