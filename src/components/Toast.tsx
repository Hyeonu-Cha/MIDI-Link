import { FC, useEffect, useState, useCallback } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'error' | 'success' | 'info';
}

let nextId = 0;

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const ToastContainer: FC<ToastContainerProps> = ({ toasts, onDismiss }) => (
  <div data-testid="toast-container" className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm">
    {toasts.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
    ))}
  </div>
);

const typeStyles: Record<ToastMessage['type'], string> = {
  error:   'bg-[#991b1b] text-[#fecaca] border border-[#dc2626]',
  success: 'bg-[#166534] text-[#bbf7d0] border border-[#22c55e]',
  info:    'bg-[#1e3a5f] text-[#bfdbfe] border border-[#3b82f6]',
};

const ToastItem: FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      data-testid="toast"
      data-toast-type={toast.type}
      className={`toast-animate flex items-center justify-between gap-3 px-4 py-3 rounded-lg cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${typeStyles[toast.type]}`}
      onClick={() => onDismiss(toast.id)}
    >
      <span className="text-xs flex-1">{toast.text}</span>
      <button className="text-inherit opacity-60 hover:opacity-100 text-base leading-none">&times;</button>
    </div>
  );
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, addToast, dismissToast };
}

export default ToastContainer;
