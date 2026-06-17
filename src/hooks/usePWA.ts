'use client'
// src/hooks/usePWA.ts
import { useEffect, useState } from 'react'
import axios from 'axios'

export function useServiceWorker() {
  const [swRegistered, setSwRegistered] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW registered:', reg.scope)
          setSwRegistered(true)
        })
        .catch((err) => console.error('SW registration failed:', err))
    }
  }, [])

  return { swRegistered }
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // When coming back online, sync pending sales
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending()
    }
  }, [isOnline])

  async function syncPending() {
    try {
      const { getPendingSales, markSaleSynced } = await import('@/lib/offline-db')
      const pending = await getPendingSales()
      if (pending.length === 0) return

      console.log(`Syncing ${pending.length} pending sales...`)
      for (const item of pending) {
        try {
          await axios.post('/api/billing', item.data)
          await markSaleSynced(item.id)
        } catch (err) {
          console.error('Failed to sync sale:', err)
        }
      }
      setPendingCount(0)
      console.log('Sync complete!')
    } catch (err) {
      console.error('Sync error:', err)
    }
  }

  return { isOnline, pendingCount, syncPending }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing

    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    })
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
