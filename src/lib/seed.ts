// src/lib/seed.ts
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

import dotenv from 'dotenv'
dotenv.config()

// We import models directly using mongoose to avoid Next.js specific issues
const MONGODB_URI = process.env.MONGODB_URI || ""

async function main() {
  console.log('🌱 Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected!')

  const db = mongoose.connection.db!

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = db.collection('users')
  await users.createIndex({ email: 1 }, { unique: true })

  const userSeeds = [
    { name: 'Shop Admin', email: 'admin@hardwareshop.com', password: 'Admin@123', role: 'ADMIN', phone: '+91-9876543210' },
    { name: 'Store Manager', email: 'manager@hardwareshop.com', password: 'Manager@123', role: 'MANAGER', phone: '+91-9876543211' },
    { name: 'Sales Staff', email: 'staff@hardwareshop.com', password: 'Staff@123', role: 'STAFF', phone: '+91-9876543212' },
    { name: 'Accountant', email: 'accountant@hardwareshop.com', password: 'Accountant@123', role: 'ACCOUNTANT', phone: '+91-9876543213' },
  ]

  for (const u of userSeeds) {
    const hashed = await bcrypt.hash(u.password, 12)
    await users.updateOne(
      { email: u.email },
      { $setOnInsert: { ...u, password: hashed, isActive: true, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    )
  }
  console.log('✅ Users seeded')

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = db.collection('categories')
  await categories.createIndex({ name: 1 }, { unique: true })

  const catSeeds = [
    { name: 'Electrical', color: '#f59e0b', icon: 'zap' },
    { name: 'Plumbing', color: '#3b82f6', icon: 'droplets' },
    { name: 'Tools & Hardware', color: '#6366f1', icon: 'wrench' },
    { name: 'Paints & Finishes', color: '#ec4899', icon: 'paintbrush' },
    { name: 'Fasteners', color: '#14b8a6', icon: 'settings' },
    { name: 'Safety Equipment', color: '#ef4444', icon: 'shield' },
    { name: 'Pipes & Fittings', color: '#8b5cf6', icon: 'pipe' },
    { name: 'Lighting', color: '#f97316', icon: 'lightbulb' },
  ]

  for (const c of catSeeds) {
    await categories.updateOne(
      { name: c.name },
      { $setOnInsert: { ...c, createdAt: new Date() } },
      { upsert: true }
    )
  }
  console.log('✅ Categories seeded')

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const suppliers = db.collection('suppliers')

  const supplierSeeds = [
    { name: 'Havells India Ltd', phone: '011-66000000', email: 'orders@havells.com', gstin: '07AAACH4686N1ZA', contactPerson: 'Raj Kumar' },
    { name: 'Asian Paints Ltd', phone: '022-67417000', email: 'dealer@asianpaints.com', gstin: '27AAACA0909G1Z1', contactPerson: 'Priya Shah' },
    { name: 'Supreme Industries', phone: '022-40882000', email: 'info@supreme.co.in', gstin: '27AAACS7399Q1ZI', contactPerson: 'Amit Verma' },
    { name: 'Bosch India', phone: '080-41281028', email: 'orders@bosch.in', gstin: '29AABCI1681H1ZR', contactPerson: 'Suresh Nair' },
  ]

  for (const s of supplierSeeds) {
    await suppliers.updateOne(
      { name: s.name },
      { $setOnInsert: { ...s, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    )
  }
  console.log('✅ Suppliers seeded')

  // ── Get category IDs ───────────────────────────────────────────────────────
  const getCat = async (name: string) => (await categories.findOne({ name }))?._id

  const electrical = await getCat('Electrical')
  const plumbing = await getCat('Plumbing')
  const tools = await getCat('Tools & Hardware')
  const paints = await getCat('Paints & Finishes')
  const fasteners = await getCat('Fasteners')
  const lighting = await getCat('Lighting')

  // ── Products ───────────────────────────────────────────────────────────────
  const products = db.collection('products')
  await products.createIndex({ sku: 1 }, { unique: true })
  await products.createIndex({ name: 'text', sku: 'text' })

  const productSeeds = [
    { name: 'Havells 1.5mm Wire (100m)', sku: 'HVL-WIRE-1.5', categoryId: electrical, costPrice: 850, sellingPrice: 1050, currentStock: 45, minStockLevel: 10, unit: 'roll' },
    { name: 'Havells 2.5mm Wire (100m)', sku: 'HVL-WIRE-2.5', categoryId: electrical, costPrice: 1350, sellingPrice: 1650, currentStock: 32, minStockLevel: 8, unit: 'roll' },
    { name: 'MCB 32A Single Pole', sku: 'MCB-32A-SP', categoryId: electrical, costPrice: 180, sellingPrice: 250, currentStock: 6, minStockLevel: 20, unit: 'piece' },
    { name: 'PVC Conduit Pipe 25mm (3m)', sku: 'PVC-COND-25', categoryId: electrical, costPrice: 45, sellingPrice: 65, currentStock: 120, minStockLevel: 30, unit: 'piece' },
    { name: 'CPVC Pipe 1 inch (3m)', sku: 'CPVC-1IN-3M', categoryId: plumbing, costPrice: 220, sellingPrice: 320, currentStock: 80, minStockLevel: 20, unit: 'piece' },
    { name: 'Ball Valve 1 inch Brass', sku: 'BV-1IN-BRASS', categoryId: plumbing, costPrice: 185, sellingPrice: 280, currentStock: 35, minStockLevel: 10, unit: 'piece' },
    { name: 'Water Tank Float Valve', sku: 'FV-TANK-STD', categoryId: plumbing, costPrice: 120, sellingPrice: 180, currentStock: 4, minStockLevel: 15, unit: 'piece' },
    { name: 'Bosch Drill Machine 13mm', sku: 'BSH-DRILL-13', categoryId: tools, costPrice: 2200, sellingPrice: 3200, currentStock: 8, minStockLevel: 3, unit: 'piece' },
    { name: 'Hacksaw Frame + Blade', sku: 'HSW-FRM-STD', categoryId: tools, costPrice: 95, sellingPrice: 150, currentStock: 22, minStockLevel: 8, unit: 'piece' },
    { name: 'Asian Paints Emulsion 20L', sku: 'AP-EMU-20L', categoryId: paints, costPrice: 2800, sellingPrice: 3800, currentStock: 18, minStockLevel: 5, unit: 'can' },
    { name: 'Asian Paints Primer 4L', sku: 'AP-PRIM-4L', categoryId: paints, costPrice: 450, sellingPrice: 650, currentStock: 25, minStockLevel: 8, unit: 'can' },
    { name: 'GI Screw 1 inch (100pcs)', sku: 'GI-SCR-1IN-100', categoryId: fasteners, costPrice: 35, sellingPrice: 55, currentStock: 200, minStockLevel: 50, unit: 'pack' },
    { name: 'Anchor Bolt M8x80mm (25pcs)', sku: 'ANCH-M8-80-25', categoryId: fasteners, costPrice: 85, sellingPrice: 135, currentStock: 75, minStockLevel: 20, unit: 'pack' },
    { name: 'LED Bulb 9W (Warm White)', sku: 'LED-9W-WW', categoryId: lighting, costPrice: 65, sellingPrice: 100, currentStock: 150, minStockLevel: 30, unit: 'piece' },
    { name: 'LED Tube Light 18W 4ft', sku: 'LED-TUBE-18W', categoryId: lighting, costPrice: 180, sellingPrice: 280, currentStock: 3, minStockLevel: 20, unit: 'piece' },
  ]

  for (const p of productSeeds) {
    await products.updateOne(
      { sku: p.sku },
      { $setOnInsert: { ...p, taxRate: 18, isActive: true, maxStockLevel: 1000, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    )
  }
  console.log('✅ Products seeded')

  // ── Expense Categories ──────────────────────────────────────────────────────
  const expCats = db.collection('expensecategories')
  await expCats.createIndex({ name: 1 }, { unique: true })

  const expCatSeeds = [
    { name: 'Rent', color: '#ef4444' },
    { name: 'Electricity', color: '#f59e0b' },
    { name: 'Salaries', color: '#3b82f6' },
    { name: 'Transport', color: '#14b8a6' },
    { name: 'Maintenance', color: '#8b5cf6' },
    { name: 'Marketing', color: '#ec4899' },
    { name: 'Miscellaneous', color: '#6b7280' },
  ]

  for (const e of expCatSeeds) {
    await expCats.updateOne({ name: e.name }, { $setOnInsert: { ...e, createdAt: new Date() } }, { upsert: true })
  }
  console.log('✅ Expense categories seeded')

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = db.collection('customers')
  await customers.createIndex({ phone: 1 }, { unique: true })

  const customerSeeds = [
    { name: 'Rajesh Construction', phone: '+91-9811001001', email: 'rajesh@construction.com', gstin: '07AAABR1234A1Z5', creditLimit: 50000 },
    { name: 'Sharma Electricals', phone: '+91-9822002002', email: 'sharma@elec.com', creditLimit: 25000 },
    { name: 'Kumar Plumbing Works', phone: '+91-9833003003', creditLimit: 15000 },
    { name: 'Patel Hardware Store', phone: '+91-9844004004', email: 'patel@hardware.com', creditLimit: 30000 },
    { name: 'Singh Builders', phone: '+91-9855005005', gstin: '29AAABS5678B2Z3', creditLimit: 75000 },
  ]

  for (const c of customerSeeds) {
    await customers.updateOne(
      { phone: c.phone },
      { $setOnInsert: { ...c, balance: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    )
  }
  console.log('✅ Customers seeded')

  await mongoose.disconnect()
  console.log('\n✅ Seeding complete!')
  console.log('\n📋 Default Credentials:')
  console.log('  Admin:       admin@hardwareshop.com / Admin@123')
  console.log('  Manager:     manager@hardwareshop.com / Manager@123')
  console.log('  Staff:       staff@hardwareshop.com / Staff@123')
  console.log('  Accountant:  accountant@hardwareshop.com / Accountant@123')
}

main().catch((e) => { console.error(e); process.exit(1) })
