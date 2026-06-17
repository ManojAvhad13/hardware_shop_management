# 🔧 HardwareShop Pro — MongoDB Edition

**Complete hardware shop management system** built with Next.js 14, TailwindCSS, and **MongoDB (Mongoose)**.

---

## ✨ Features

| Feature | Details |
|---|---|
| 📊 **Dashboard** | Real-time P&L, 7-day trend chart, category pie, payment breakdown |
| 🛒 **Billing / POS** | Cart, GST auto-calc, discounts, multi-payment methods, invoice PDF |
| 📦 **Inventory** | Full CRUD, stock adjustments, low-stock push alerts, movement log |
| 👥 **Customers** | Ledger, credit limit, balance, purchase history, payment reminders |
| 💰 **Expenses** | Category tracking, date filters, P&L integration |
| 📋 **Reports** | P&L, Sales, Inventory — all export to PDF |
| 🔔 **Push Notifications** | Low/out-of-stock alerts via Web Push API |
| 📱 **PWA / Mobile** | Installable on phone, offline cache, background sync |
| 🔐 **RBAC** | ADMIN · MANAGER · STAFF · ACCOUNTANT roles with granular permissions |
| ☁️ **Multi-Device Sync** | MongoDB Atlas keeps all devices in sync in real time |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Styling | TailwindCSS (dark theme) |
| **Database** | **MongoDB + Mongoose** |
| Auth | NextAuth.js (JWT) |
| Charts | Recharts |
| PDF Export | jsPDF + AutoTable |
| Offline | IndexedDB (idb) + Service Worker |
| Push | Web Push API + VAPID |
| Forms | React Hook Form + Zod |
| Server State | TanStack Query |

---

## 🚀 Quick Start

### 1. Prerequisites
```
Node.js >= 18
MongoDB >= 6 (local) OR MongoDB Atlas (cloud)
npm >= 9
```

### 2. Install
```bash
git clone <repo-url>
cd hardware-shop
npm install
```

### 3. MongoDB Setup

**Option A — Local MongoDB**
```bash
# Install MongoDB Community (Ubuntu)
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# The DB is created automatically on first use
```

**Option B — MongoDB Atlas (Recommended for multi-device)**
1. Create free account at https://cloud.mongodb.com
2. Create a cluster (M0 free tier works great)
3. Database Access → Add user
4. Network Access → Allow from anywhere (0.0.0.0/0) or your IP
5. Connect → Drivers → copy connection string

### 4. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and other values
nano .env.local
```

**Minimal `.env.local`:**
```env
# Local:
MONGODB_URI="mongodb://localhost:27017/hardware_shop_db"

# Atlas:
# MONGODB_URI="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/hardware_shop_db"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-this-to-a-random-32-char-string"
NEXT_PUBLIC_SHOP_NAME="Your Shop Name"
NEXT_PUBLIC_SHOP_ADDRESS="Your Address"
NEXT_PUBLIC_SHOP_PHONE="+91-XXXXXXXXXX"
NEXT_PUBLIC_SHOP_GSTIN="27AABCS1234A1Z5"
```

**Generate VAPID keys for push notifications:**
```bash
npx web-push generate-vapid-keys
# Paste the output into .env.local
```

### 5. Seed Database
```bash
npm run db:seed
```

### 6. Run
```bash
npm run dev
# → http://localhost:3000
```

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@hardwareshop.com | Admin@123 |
| **Manager** | manager@hardwareshop.com | Manager@123 |
| **Staff** | staff@hardwareshop.com | Staff@123 |
| **Accountant** | accountant@hardwareshop.com | Accountant@123 |

> ⚠️ **Change all passwords before going live!**

---

## 📁 Project Structure

```
hardware-shop/
├── src/
│   ├── app/
│   │   ├── (app)/                  # Authenticated layout + pages
│   │   │   ├── layout.tsx          # Sidebar + topbar shell
│   │   │   ├── dashboard/page.tsx  # Live P&L dashboard
│   │   │   ├── billing/            # Sales list + POS new-sale
│   │   │   ├── inventory/page.tsx  # Inventory management
│   │   │   ├── customers/page.tsx  # Customer ledger
│   │   │   ├── expenses/page.tsx   # Expense tracker
│   │   │   ├── reports/page.tsx    # P&L / Sales / Inventory reports
│   │   │   └── settings/page.tsx   # Users, notifications, shop config
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   │   ├── dashboard/          # Dashboard aggregations
│   │   │   ├── billing/            # Sale CRUD + payment recording
│   │   │   ├── inventory/          # Product CRUD + categories
│   │   │   ├── customers/          # Customer CRUD + history + reminders
│   │   │   ├── expenses/           # Expense CRUD + categories
│   │   │   ├── reports/            # P&L, sales, inventory report APIs
│   │   │   ├── suppliers/          # Supplier management
│   │   │   ├── users/              # User management (Admin only)
│   │   │   └── notifications/      # Push subscribe + unread count
│   │   ├── login/page.tsx
│   │   └── globals.css             # Dark theme tokens
│   ├── components/
│   │   ├── Providers.tsx           # Session + Query client
│   │   ├── PWAInit.tsx             # SW registration + offline prefetch
│   │   ├── billing/                # Invoice view modal, payment modal
│   │   ├── customers/              # Customer, detail, reminder modals
│   │   ├── expenses/               # Expense modal
│   │   ├── inventory/              # Product modal, stock adjust modal
│   │   └── settings/               # User modal
│   ├── models/                     # ← Mongoose models (replaces Prisma)
│   │   ├── User.ts
│   │   ├── Category.ts
│   │   ├── Supplier.ts
│   │   ├── Product.ts
│   │   ├── StockMovement.ts        # + StockAlert
│   │   ├── Customer.ts
│   │   ├── Sale.ts                 # Embedded items + payment records
│   │   ├── Expense.ts              # + ExpenseCategory
│   │   └── PaymentReminder.ts
│   ├── lib/
│   │   ├── mongoose.ts             # ← MongoDB connection singleton
│   │   ├── seed.ts                 # ← MongoDB seed script
│   │   ├── auth.ts                 # NextAuth with Mongoose User
│   │   ├── notifications.ts        # Web Push utilities
│   │   ├── pdf-generator.ts        # Invoice + report PDFs
│   │   ├── offline-db.ts           # IndexedDB for offline
│   │   └── utils.ts                # Formatters, helpers
│   ├── hooks/usePWA.ts             # SW + offline sync hooks
│   └── types/index.ts              # TypeScript interfaces
├── public/
│   ├── sw.js                       # Service Worker
│   ├── manifest.json               # PWA manifest
│   └── offline.html                # Offline fallback
└── .env.example                    # Environment template
```

---

## 🗄️ MongoDB Collections

| Collection | Description |
|---|---|
| `users` | Staff accounts with hashed passwords and roles |
| `categories` | Product categories (Electrical, Plumbing, etc.) |
| `suppliers` | Vendor master data |
| `products` | Inventory with stock levels + indexes for text search |
| `stockmovements` | Every stock change event (sale/purchase/adjustment) |
| `stockalerts` | Low stock notification records |
| `customers` | Customer ledger with credit limit and balance |
| `sales` | Invoice documents with **embedded items + payment records** |
| `expenses` | Operating expenses with embedded category info |
| `expensecategories` | Rent, Electricity, Salaries, etc. |
| `paymentreminders` | Scheduled SMS/WhatsApp reminder records |

> **MongoDB design note:** Sale items and payment records are embedded inside the `sales` document (not separate collections) for fast reads and atomic writes — matching MongoDB best practices.

---

## 📱 PWA Mobile Installation

1. Open the app URL in Chrome (Android) or Safari (iOS)
2. **Android:** Browser menu → "Add to Home Screen"
3. **iOS:** Share button → "Add to Home Screen"

Features when installed:
- Works offline with cached inventory & customers
- Push notifications for stock alerts
- Full-screen native-app experience

---

## 🔔 Push Notification Setup

```bash
# 1. Generate VAPID keys
npx web-push generate-vapid-keys

# 2. Add to .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_EMAIL="mailto:admin@shop.com"

# 3. Login → Settings → Notifications → Enable Push
# 4. Alerts fire when:
#    - Stock ≤ minStockLevel → Low Stock warning
#    - Stock = 0 → Out of Stock (high priority)
```

---

## ☁️ Production Deployment

### Deploy to Vercel + MongoDB Atlas (Recommended)
```bash
# 1. Push to GitHub
# 2. Import project in vercel.com
# 3. Add environment variables in Vercel dashboard
# 4. Deploy!

# The MongoDB Atlas URI handles multi-device sync automatically
```

### Self-hosted (VPS/Server)
```bash
npm run build
pm2 start npm --name "hwshop" -- start
# Use nginx as reverse proxy on port 80/443
```

---

## 🐛 Troubleshooting

**Connection error to MongoDB:**
```bash
# Check MongoDB is running (local)
sudo systemctl status mongod

# Test connection string
node -e "const m = require('mongoose'); m.connect(process.env.MONGODB_URI).then(() => { console.log('OK'); m.disconnect(); })"
```

**Models not found / OverwriteModelError:**
- This is normal in dev hot-reload — models use `mongoose.models.X || mongoose.model('X', schema)` guard

**Push not working on iOS:**
- iOS requires HTTPS for push notifications
- Use a proper domain with SSL in production

---

## 📄 License

MIT — Free for personal and commercial use.

---

*Built for hardware shop owners across India 🇮🇳*
