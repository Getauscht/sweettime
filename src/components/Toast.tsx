'use client'

import React from 'react'

type ToastType = 'success' | 'error' | 'info'

let idCounter = 0

export function useToast() {
  const [toasts, setToasts] = React.useState<{ id: number; message: string; type: ToastType }[]>([])

  const toast = (message: string, type: ToastType = 'info') => {
    const id = ++idCounter
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )

  return { toast, ToastContainer }
}
