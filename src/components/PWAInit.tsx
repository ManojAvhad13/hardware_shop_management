'use client'
// src/components/PWAInit.tsx
// Registers the service worker and sets up offline sync on app load
import { useEffect } from 'react'
import { useServiceWorker } from '@/hooks/usePWA'

export default function PWAInit() {
  useServiceWorker()

  useEffect(() => {
    // Pre-cache inventory and customers for offline use when online
    async function prefetchOfflineData() {
      if (!navigator.onLine) return
      try {
        const { cacheProducts, cacheCustomers } = await import('@/lib/offline-db')
        const [prodRes, custRes] = await Promise.all([
          fetch('/api/inventory?pageSize=500').then(r => r.json()),
          fetch('/api/customers?pageSize=200').then(r => r.json()),
        ])
        if (prodRes.data) {
          await cacheProducts(
            prodRes.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              sellingPrice: p.sellingPrice,
              currentStock: p.currentStock,
              unit: p.unit,
              categoryId: p.categoryId,
              taxRate: p.taxRate,
              updatedAt: p.updatedAt,
            }))
          )
        }
        if (custRes.data) {
          await cacheCustomers(
            custRes.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              balance: c.balance,
              updatedAt: c.updatedAt,
            }))
          )
        }
      } catch {
        // Silently fail — offline caching is best-effort
      }
    }

    const timer = setTimeout(prefetchOfflineData, 3000) // delay so it doesn't block initial load
    return () => clearTimeout(timer)
  }, [])

  return null
}
