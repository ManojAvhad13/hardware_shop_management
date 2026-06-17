'use client'
// src/components/customers/ReminderModal.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Bell } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function ReminderModal({
  customer,
  onClose,
}: {
  customer: any
  onClose: () => void
}) {
  const [type, setType] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('WHATSAPP')
  const [message, setMessage] = useState(
    `Dear ${customer.name},\n\nThis is a friendly reminder that you have an outstanding balance of ${formatCurrency(customer.balance)} at our shop.\n\nKindly clear the dues at your earliest convenience.\n\nThank you,\n${process.env.NEXT_PUBLIC_SHOP_NAME || 'Hardware Shop'}`
  )

  const mutation = useMutation({
    mutationFn: (data: any) => axios.post(`/api/customers/${customer.id}/reminder`, data),
    onSuccess: () => {
      toast.success('Reminder scheduled!')
      onClose()
    },
    onError: () => toast.error('Failed to send reminder'),
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md w-full">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Payment Reminder</h2>
              <p className="text-xs text-slate-400">{customer.name} · Due: {formatCurrency(customer.balance)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Send via</label>
            <div className="flex gap-2">
              {(['WHATSAPP', 'SMS', 'EMAIL'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    type === t
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                      : 'border-slate-600/50 bg-slate-800/40 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {t === 'WHATSAPP' ? '💬 WhatsApp' : t === 'SMS' ? '📱 SMS' : '📧 Email'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="textarea"
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-xs text-amber-400">
              ℹ️ This will create a reminder record. For actual sending, integrate with Twilio/WhatsApp Business API.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => mutation.mutate({ type, message })}
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? 'Sending...' : `Send ${type}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
