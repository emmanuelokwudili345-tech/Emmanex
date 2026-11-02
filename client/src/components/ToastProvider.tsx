
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react'
import {
  ToastContext,
  type ToastInput,
  type ToastType,
} from './useToast'


type ToastMessage = {
  id: number
  type: ToastType
  title: string
  message?: string
  duration: number
}


let nextToastId = 0

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: (id: number) => void
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration)

    return () => window.clearTimeout(timeoutId)
  }, [toast.id, toast.duration, onDismiss])

  const Icon =
    toast.type === 'success'
      ? CheckCircle2
      : toast.type === 'error'
        ? AlertCircle
        : Info

  return (
    <div
      className={`toast toast-${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <span className="toast-icon" aria-hidden="true">
        <Icon size={21} strokeWidth={2} />
      </span>

      <div className="toast-content">
        <p className="toast-title">{toast.title}</p>
        {toast.message && (
          <p className="toast-message">{toast.message}</p>
        )}
      </div>

      <button
        className="toast-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        <X size={17} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([])
  const activeToast = queue[0] ?? null

  const dismissToast = useCallback((id: number) => {
    setQueue((current) =>
      current[0]?.id === id
        ? current.slice(1)
        : current.filter((toast) => toast.id !== id),
    )
  }, [])

  const showToast = useCallback(
    ({ type, title, message, duration }: ToastInput) => {
      const id = ++nextToastId

      setQueue((current) => [
        ...current,
        { id, type, title, message, duration: duration && duration > 0 ? duration : 4500 },
      ])
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      <div className="toast-container" aria-label="Notifications" aria-live="polite">
        {activeToast && (
          <ToastItem
            key={activeToast.id}
            toast={activeToast}
            onDismiss={dismissToast}
          />
        )}
      </div>
    </ToastContext.Provider>
  )
}