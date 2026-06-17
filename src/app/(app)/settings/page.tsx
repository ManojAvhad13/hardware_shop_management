'use client'
// src/app/(app)/settings/page.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Settings, Users, Bell, Shield, Plus, Edit2, Trash2, RefreshCw, Key
} from 'lucide-react'
import UserModal from '@/components/settings/UserModal'

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'shop'>('users')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [pushEnabled, setPushEnabled] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => axios.get('/api/users').then(r => r.data),
    enabled: role === 'ADMIN',
  })

  // Check push notification status
  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  const handleEnablePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('Push notifications not supported')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permission denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      await axios.post('/api/notifications/subscribe', sub)
      setPushEnabled(true)
      toast.success('Push notifications enabled!')
    } catch (err) {
      toast.error('Failed to enable push notifications')
      console.error(err)
    }
  }

  const handleDisablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await axios.delete('/api/notifications/subscribe')
      setPushEnabled(false)
      toast.success('Push notifications disabled')
    } catch {
      toast.error('Failed to disable')
    }
  }

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User removed') },
    onError: () => toast.error('Failed to remove user'),
  })

  const tabs = [
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'shop', label: 'Shop Info', icon: Settings },
  ] as const

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage users, notifications, and shop configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400 bg-brand-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">Manage staff accounts and role-based access</p>
            {role === 'ADMIN' && (
              <button onClick={() => setShowAddUser(true)} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Add User
              </button>
            )}
          </div>

          {/* Role permissions info */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Role Permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { role: 'ADMIN', color: 'text-red-400', bg: 'bg-red-500/10', perms: ['Full access', 'Manage users', 'Delete data', 'All reports', 'Settings'] },
                { role: 'MANAGER', color: 'text-amber-400', bg: 'bg-amber-500/10', perms: ['Read & Write', 'Delete records', 'All reports', 'No user mgmt'] },
                { role: 'ACCOUNTANT', color: 'text-blue-400', bg: 'bg-blue-500/10', perms: ['Read only', 'View reports', 'Manage expenses', 'No sales'] },
                { role: 'STAFF', color: 'text-green-400', bg: 'bg-green-500/10', perms: ['Create sales', 'View inventory', 'Add customers', 'No delete'] },
              ].map(r => (
                <div key={r.role} className={`p-4 rounded-xl border border-slate-700/40 ${r.bg}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className={`w-4 h-4 ${r.color}`} />
                    <p className={`text-sm font-semibold ${r.color}`}>{r.role}</p>
                  </div>
                  <ul className="space-y-1">
                    {r.perms.map(p => (
                      <li key={p} className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-600" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Users list */}
          {isLoading ? (
            <div className="card p-10 text-center">
              <RefreshCw className="w-7 h-7 animate-spin text-slate-600 mx-auto mb-3" />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((user: any) => (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
                              <span className="text-brand-400 font-bold text-sm">{user.name.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-slate-200">{user.name}</span>
                          </div>
                        </td>
                        <td className="text-slate-400 text-sm">{user.email}</td>
                        <td className="text-slate-400 text-sm">{user.phone || '—'}</td>
                        <td>
                          <span className={`badge ${
                            user.role === 'ADMIN' ? 'badge-red'
                            : user.role === 'MANAGER' ? 'badge-amber'
                            : user.role === 'ACCOUNTANT' ? 'badge-blue'
                            : 'badge-green'
                          }`}>{user.role}</span>
                        </td>
                        <td>
                          <span className={user.isActive ? 'badge-green' : 'badge-red'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {role === 'ADMIN' && user.id !== (session?.user as any)?.id && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditUser(user)} className="btn-ghost btn-icon btn-sm">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => confirm(`Remove ${user.name}?`) && deleteUserMutation.mutate(user.id)}
                                className="btn-danger btn-icon btn-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Notifications Tab ─────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${pushEnabled ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                <Bell className={`w-6 h-6 ${pushEnabled ? 'text-green-400' : 'text-slate-500'}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-100 mb-1">Push Notifications</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Get real-time alerts for low stock, out-of-stock items, and payment due reminders directly on this device.
                </p>
                <div className="space-y-2 text-sm text-slate-400 mb-4">
                  <p>• ⚠️ Low stock alerts when items fall below minimum level</p>
                  <p>• 🚨 Out-of-stock alerts requiring immediate reorder</p>
                  <p>• 💰 Payment due reminders for outstanding customers</p>
                </div>
                {pushEnabled ? (
                  <div className="flex items-center gap-3">
                    <span className="badge-green">✓ Enabled on this device</span>
                    <button onClick={handleDisablePush} className="btn-danger btn-sm">
                      Disable Notifications
                    </button>
                  </div>
                ) : (
                  <button onClick={handleEnablePush} className="btn-primary">
                    <Bell className="w-4 h-4" /> Enable Push Notifications
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-100 mb-3">Alert Thresholds</h3>
            <p className="text-sm text-slate-400">
              Stock alerts are triggered based on each product's minimum stock level configured in the Inventory section.
              Navigate to <strong className="text-brand-400">Inventory → Edit Product → Min Stock Level</strong> to customize per-product thresholds.
            </p>
          </div>
        </div>
      )}

      {/* ── Shop Info Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'shop' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-100">Shop Information</h3>
          <p className="text-sm text-slate-400">
            Configure shop details in your <code className="text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">.env.local</code> file:
          </p>
          <div className="bg-slate-900/70 rounded-xl p-4 font-mono text-sm space-y-1 border border-slate-700/50">
            {[
              ['NEXT_PUBLIC_SHOP_NAME', process.env.NEXT_PUBLIC_SHOP_NAME || 'Your Shop Name'],
              ['NEXT_PUBLIC_SHOP_ADDRESS', process.env.NEXT_PUBLIC_SHOP_ADDRESS || 'Your Address'],
              ['NEXT_PUBLIC_SHOP_PHONE', process.env.NEXT_PUBLIC_SHOP_PHONE || '+91-XXXXXXXXXX'],
              ['NEXT_PUBLIC_SHOP_GSTIN', process.env.NEXT_PUBLIC_SHOP_GSTIN || 'GSTIN Number'],
            ].map(([key, val]) => (
              <p key={key} className="text-slate-400">
                <span className="text-green-400">{key}</span>=<span className="text-brand-400">"{val}"</span>
              </p>
            ))}
          </div>
          <p className="text-xs text-slate-500">Restart the server after changing environment variables.</p>
        </div>
      )}

      {showAddUser && (
        <UserModal
          onClose={() => setShowAddUser(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['users'] }); setShowAddUser(false) }}
        />
      )}
      {editUser && (
        <UserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null) }}
        />
      )}
    </div>
  )
}
