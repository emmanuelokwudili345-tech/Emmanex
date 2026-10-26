
import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastInput = {
  type: ToastType
  title: string
  message?: string
  duration?: number
}

export type ToastContextValue = {
  showToast: (toast: ToastInput) => void
  dismissToast: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.')
  }

  return context
}
