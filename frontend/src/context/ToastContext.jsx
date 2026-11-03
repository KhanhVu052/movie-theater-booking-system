import { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastIdRef = useRef(0);

  // 1. Toast Dispatcher
  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 2. Promise-based Confirmation Dialog
  const confirm = useCallback(
    ({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDestructive = false,
    }) => {
      return new Promise((resolve) => {
        setConfirmDialog({
          title,
          message,
          confirmText,
          cancelText,
          isDestructive,
          resolve: (result) => {
            setConfirmDialog(null);
            resolve(result);
          },
        });
      });
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        {toasts.map((toast) => {
          let Icon = CheckCircle2;
          let borderClass = 'border-emerald-600/80 bg-emerald-950/90 text-emerald-100';
          let iconColor = 'text-emerald-400';

          if (toast.type === 'error') {
            Icon = AlertCircle;
            borderClass = 'border-red-600/80 bg-red-950/90 text-red-100';
            iconColor = 'text-red-400';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            borderClass = 'border-amber-600/80 bg-amber-950/90 text-amber-100';
            iconColor = 'text-amber-400';
          } else if (toast.type === 'info') {
            Icon = Info;
            borderClass = 'border-[#e0b354]/80 bg-[#1f1710]/95 text-[#f5ece0]';
            iconColor = 'text-[#e0b354]';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-slideUp ${borderClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs leading-relaxed font-medium">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-0.5 transition-opacity cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Cinematic Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
          <div
            className="w-full max-w-md bg-[#16100a] border border-[#4d3c26] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  confirmDialog.isDestructive
                    ? 'bg-red-950/60 border-red-700 text-red-400'
                    : 'bg-[#241a10] border-[#e0b354] text-[#f3cb62]'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <HelpCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-body font-bold text-base text-[#f7efe4]">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-[#ab9a84] mt-1 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#2e2316]">
              <button
                type="button"
                onClick={() => confirmDialog.resolve(false)}
                className="px-4 py-2 rounded-lg bg-[#1a130d] border border-[#3d2f1d] hover:border-[#5e4727] text-xs font-semibold text-[#c7b59d] hover:text-[#f5ece0] transition-colors cursor-pointer"
              >
                {confirmDialog.cancelText}
              </button>

              <button
                type="button"
                onClick={() => confirmDialog.resolve(true)}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
                    : 'bg-gradient-to-b from-[#f3cb62] to-[#dda938] hover:from-[#f7d576] hover:to-[#e5b344] text-[#1a1209]'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
