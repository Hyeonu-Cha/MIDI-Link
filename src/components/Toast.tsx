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
  <div className="toast-container">
    {toasts.map((toast) => (
      <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
    ))}
  </div>
);

const typeClass: Record<ToastMessage['type'], string> = {
  error:   't-error',
  success: 't-success',
  info:    't-info',
};

const ToastItem: FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`toast ${typeClass[toast.type]}`}
      onClick={() => onDismiss(toast.id)}
    >
      <span>{toast.text}</span>
      <button className="toast-close" aria-label="Dismiss">×</button>
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
