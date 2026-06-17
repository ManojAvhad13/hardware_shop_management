// src/lib/notifications.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@hardwareshop.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      ...payload,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
    }))
    return true
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired/invalid
      return false
    }
    console.error('Push notification error:', error)
    return false
  }
}

export async function sendLowStockAlert(
  subscriptions: { token: string }[],
  productName: string,
  currentStock: number,
  minStock: number
): Promise<void> {
  const payload: PushPayload = {
    title: '⚠️ Low Stock Alert',
    body: `${productName}: Only ${currentStock} units left (Min: ${minStock})`,
    tag: 'low-stock',
    url: '/inventory?filter=low-stock',
    data: { type: 'LOW_STOCK', productName, currentStock },
  }

  await Promise.allSettled(
    subscriptions.map(sub => {
      try {
        const parsed = JSON.parse(sub.token)
        return sendPushNotification(parsed, payload)
      } catch {
        return Promise.resolve(false)
      }
    })
  )
}

export async function sendOutOfStockAlert(
  subscriptions: { token: string }[],
  productName: string
): Promise<void> {
  const payload: PushPayload = {
    title: '🚨 Out of Stock!',
    body: `${productName} is now OUT OF STOCK. Reorder immediately!`,
    tag: 'out-of-stock',
    url: '/inventory?filter=out-of-stock',
    data: { type: 'OUT_OF_STOCK', productName },
  }

  await Promise.allSettled(
    subscriptions.map(sub => {
      try {
        const parsed = JSON.parse(sub.token)
        return sendPushNotification(parsed, payload)
      } catch {
        return Promise.resolve(false)
      }
    })
  )
}

export async function sendPaymentDueAlert(
  subscriptions: { token: string }[],
  customerName: string,
  amount: number,
  daysOverdue: number
): Promise<void> {
  const payload: PushPayload = {
    title: '💰 Payment Due Reminder',
    body: `${customerName} has ₹${amount.toFixed(2)} overdue by ${daysOverdue} days`,
    tag: 'payment-due',
    url: '/customers',
    data: { type: 'PAYMENT_DUE', customerName, amount },
  }

  await Promise.allSettled(
    subscriptions.map(sub => {
      try {
        const parsed = JSON.parse(sub.token)
        return sendPushNotification(parsed, payload)
      } catch {
        return Promise.resolve(false)
      }
    })
  )
}
