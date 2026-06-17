// src/lib/offline-db.ts
// IndexedDB wrapper for offline data sync

import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface HardwareShopDB extends DBSchema {
  products: {
    key: string
    value: {
      id: string
      name: string
      sku: string
      sellingPrice: number
      currentStock: number
      unit: string
      categoryId: string
      taxRate: number
      updatedAt: string
    }
    indexes: { 'by-sku': string; 'by-name': string }
  }
  customers: {
    key: string
    value: {
      id: string
      name: string
      phone: string
      balance: number
      updatedAt: string
    }
    indexes: { 'by-phone': string }
  }
  pendingSales: {
    key: string
    value: {
      id: string
      data: unknown
      createdAt: string
      synced: boolean
    }
  }
  syncQueue: {
    key: string
    value: {
      id: string
      action: 'CREATE' | 'UPDATE' | 'DELETE'
      entity: string
      data: unknown
      timestamp: string
    }
  }
}

let db: IDBPDatabase<HardwareShopDB> | null = null

export async function getDB(): Promise<IDBPDatabase<HardwareShopDB>> {
  if (db) return db

  db = await openDB<HardwareShopDB>('hardware-shop-db', 1, {
    upgrade(database) {
      // Products store
      const productStore = database.createObjectStore('products', { keyPath: 'id' })
      productStore.createIndex('by-sku', 'sku')
      productStore.createIndex('by-name', 'name')

      // Customers store
      const customerStore = database.createObjectStore('customers', { keyPath: 'id' })
      customerStore.createIndex('by-phone', 'phone')

      // Pending sales (created offline)
      database.createObjectStore('pendingSales', { keyPath: 'id' })

      // Sync queue for offline changes
      database.createObjectStore('syncQueue', { keyPath: 'id' })
    },
  })

  return db
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function cacheProducts(products: HardwareShopDB['products']['value'][]) {
  const db = await getDB()
  const tx = db.transaction('products', 'readwrite')
  await Promise.all([
    ...products.map(p => tx.store.put(p)),
    tx.done,
  ])
}

export async function getCachedProducts() {
  const db = await getDB()
  return db.getAll('products')
}

export async function searchCachedProducts(query: string) {
  const products = await getCachedProducts()
  const q = query.toLowerCase()
  return products.filter(p =>
    p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  )
}

// ── Customers ──────────────────────────────────────────────────────────────────

export async function cacheCustomers(customers: HardwareShopDB['customers']['value'][]) {
  const db = await getDB()
  const tx = db.transaction('customers', 'readwrite')
  await Promise.all([
    ...customers.map(c => tx.store.put(c)),
    tx.done,
  ])
}

export async function getCachedCustomers() {
  const db = await getDB()
  return db.getAll('customers')
}

// ── Pending Sales ──────────────────────────────────────────────────────────────

export async function addPendingSale(sale: unknown) {
  const db = await getDB()
  const id = `pending-${Date.now()}`
  await db.put('pendingSales', {
    id,
    data: sale,
    createdAt: new Date().toISOString(),
    synced: false,
  })
  return id
}

export async function getPendingSales() {
  const db = await getDB()
  const all = await db.getAll('pendingSales')
  return all.filter(s => !s.synced)
}

export async function markSaleSynced(id: string) {
  const db = await getDB()
  const sale = await db.get('pendingSales', id)
  if (sale) {
    await db.put('pendingSales', { ...sale, synced: true })
  }
}

// ── Sync Queue ──────────────────────────────────────────────────────────────────

export async function addToSyncQueue(action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: unknown) {
  const db = await getDB()
  await db.put('syncQueue', {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    action,
    entity,
    data,
    timestamp: new Date().toISOString(),
  })
}

export async function getSyncQueue() {
  const db = await getDB()
  return db.getAll('syncQueue')
}

export async function clearSyncQueue() {
  const db = await getDB()
  await db.clear('syncQueue')
}
