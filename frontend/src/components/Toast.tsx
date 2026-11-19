import React, { createContext, useContext, useState, useCallback } from 'react';
import { DecidixIcon } from './DecidixIcon';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);
      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const success = useCallback((msg: string, title?: string) => toast(msg, 'success', title), [toast]);
  const error = useCallback((msg: string, title?: string) => toast(msg, 'error', title), [toast]);
  const info = useCallback((msg: string, title?: string) => toast(msg, 'info', title), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Floating Toast Container */}
      <div
        className="fixed bottom-5 end-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-lg text-xs animate-in slide-in-from-bottom-2 duration-200 transition-all"
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <DecidixIcon name="check" size={12} color="#059669" />
                </div>
              )}
              {t.type === 'error' && (
                <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <DecidixIcon name="close" size={12} color="#E11D48" />
                </div>
              )}
              {t.type === 'info' && (
                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue flex items-center justify-center border border-blue-200">
                  <DecidixIcon name="info" size={12} color="#2563EB" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <div className="font-bold text-navy text-xs mb-0.5">{t.title}</div>}
              <div className="text-slate-600 leading-relaxed font-medium">{t.message}</div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded transition"
              aria-label="Close notification"
            >
              <DecidixIcon name="close" size={14} color="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return context;
};
