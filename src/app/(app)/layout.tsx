'use client'
// src/app/(app)/layout.tsx
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Package, Users, FileText, BarChart3,
  Settings, LogOut, Bell, Menu, X, ChevronDown, Wrench,
  ShoppingCart, TrendingUp, AlertTriangle, DollarSign,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

type NavItem = {
  href: string
  icon: LucideIcon
  label: string
  roles?: string[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/billing', icon: ShoppingCart, label: 'Billing / Sales' },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/inventory', icon: Package, label: 'Inventory' },
      { href: '/customers', icon: Users, label: 'Customers' },
      { href: '/expenses', icon: DollarSign, label: 'Expenses' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
    ],
  },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const { data: alerts } = useQuery({
    queryKey: ['stock-alerts-count'],
    queryFn: () => axios.get('/api/notifications/unread-count').then(r => r.data),
    refetchInterval: 60_000,
  })

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700/50 z-50',
        'flex flex-col transition-transform duration-300 ease-in-out',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-glow-orange">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-white truncate">HardwareShop Pro</p>
            <p className="text-[10px] text-slate-500 truncate">
              {process.env.NEXT_PUBLIC_SHOP_NAME?.split(' ').slice(0, 2).join(' ') || 'Management System'}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item =>
              !item.roles || item.roles.includes(role)
            )
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3.5 mb-2">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map(item => {
                    const active = pathname.startsWith(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn('nav-item', active && 'nav-item-active')}
                        >
                          <item.icon className={cn('w-4.5 h-4.5 flex-shrink-0', active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')} />
                          <span>{item.label}</span>
                          {item.href === '/inventory' && alerts?.count > 0 && (
                            <span className="ml-auto badge-red text-[10px] px-1.5 py-0.5">
                              {alerts.count}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto">
          {/* User */}
          <div className="p-3 border-t border-slate-700/50">
            <div className="flex items-center gap-3 p-3 rounded-3xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-400 font-bold text-sm">
                  {(session?.user?.name || 'U').charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{session?.user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{(session?.user as any)?.role}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="px-3 pb-4">
            <div className="rounded-2xl bg-slate-900/90 p-3 text-slate-400 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="font-semibold text-slate-200">Created by</span>
                <p className="leading-5">Manoj Avhad</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function TopBar({ onMenuClick, alertCount }: { onMenuClick: () => void; alertCount: number }) {
  const pathname = usePathname()
  const pageTitle = navGroups
    .flatMap(g => g.items)
    .find(item => pathname.startsWith(item.href))?.label || 'Dashboard'

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 flex items-center px-4 gap-4 sticky top-0 z-30">
      <button onClick={onMenuClick} className="lg:hidden text-slate-400 hover:text-white">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden sm:block">
        <h1 className="font-semibold text-slate-100">{pageTitle}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Offline indicator */}
        <div id="offline-indicator" className="hidden items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-400 font-medium">Offline</span>
        </div>

        <Link href="/inventory?filter=low-stock" className="relative btn-ghost btn-icon">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: alerts } = useQuery({
    queryKey: ['stock-alerts-count'],
    queryFn: () => axios.get('/api/notifications/unread-count').then(r => r.data),
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  // Offline detection
  useEffect(() => {
    const el = document.getElementById('offline-indicator')
    const update = () => {
      if (!el) return
      if (!navigator.onLine) el.classList.replace('hidden', 'flex')
      else el.classList.replace('flex', 'hidden')
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} alertCount={alerts?.count || 0} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
