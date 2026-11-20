'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

interface ToastContextValue {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirmDialog: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = type === 'error' ? 7000 : type === 'warning' ? 5500 : 4500;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
      timersRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const toast = useRef({
    success: (message: string, title?: string) => addToast('success', message, title),
    error: (message: string, title?: string) => addToast('error', message, title),
    warning: (message: string, title?: string) => addToast('warning', message, title),
    info: (message: string, title?: string) => addToast('info', message, title),
  });

  // Giữ hàm toast luôn trỏ tới addToast mới nhất
  toast.current.success = (message: string, title?: string) => addToast('success', message, title);
  toast.current.error = (message: string, title?: string) => addToast('error', message, title);
  toast.current.warning = (message: string, title?: string) => addToast('warning', message, title);
  toast.current.info = (message: string, title?: string) => addToast('info', message, title);

  const confirmDialog = useCallback((input: ConfirmOptions | string): Promise<boolean> => {
    const options: ConfirmOptions =
      typeof input === 'string'
        ? { message: input }
        : input;
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmChoice = useCallback(
    (accepted: boolean) => {
      if (confirmState) {
        confirmState.resolve(accepted);
        setConfirmState(null);
      }
    },
    [confirmState]
  );

  useEffect(() => {
    if (!confirmState) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleConfirmChoice(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, handleConfirmChoice]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: toast.current, confirmDialog }}>
      {children}

      {/* Toast Stack */}
      <div
        aria-live="polite"
        className="fixed top-16 right-4 z-[100] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((item) => {
          const styles = {
            success: {
              box: 'bg-white border-emerald-200 text-slate-800 shadow-lg shadow-emerald-950/5',
              accent: 'bg-emerald-500',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
              defaultTitle: 'Thành công',
            },
            error: {
              box: 'bg-white border-rose-200 text-slate-800 shadow-lg shadow-rose-950/5',
              accent: 'bg-rose-500',
              icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
              defaultTitle: 'Đã xảy ra lỗi',
            },
            warning: {
              box: 'bg-white border-amber-200 text-slate-800 shadow-lg shadow-amber-950/5',
              accent: 'bg-amber-500',
              icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
              defaultTitle: 'Lưu ý',
            },
            info: {
              box: 'bg-white border-sky-200 text-slate-800 shadow-lg shadow-sky-950/5',
              accent: 'bg-sky-500',
              icon: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
              defaultTitle: 'Thông báo',
            },
          }[item.type];

          return (
            <div
              key={item.id}
              role="alert"
              className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 pl-4 flex items-start gap-2.5 animate-toast-in ${styles.box}`}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`} />
              {styles.icon}
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-bold text-slate-900 leading-snug">
                  {item.title || styles.defaultTitle}
                </p>
                <p className="text-slate-600 mt-0.5 leading-relaxed break-words">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition shrink-0"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Confirm Modal (thay thế window.confirm) */}
      {confirmState && (
        <div
          className="!m-0 fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4"
          onClick={() => handleConfirmChoice(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-5 space-y-4 animate-toast-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmState.options.title || 'Xác nhận thao tác'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                {confirmState.options.cancelText || 'Hủy'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmState.options.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast phải được dùng bên trong ToastProvider');
  }
  return ctx;
}
