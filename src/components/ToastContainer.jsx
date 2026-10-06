import React from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const toasts = useStore((state) => state.toasts || []);
  const removeToast = useStore((state) => state.removeToast);

  if (!toasts || toasts.length === 0) return null;

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#166534" />;
      case 'error':
        return <AlertCircle size={18} color="#991b1b" />;
      case 'warning':
        return <AlertTriangle size={18} color="#854d0e" />;
      default:
        return <Info size={18} color="#075985" />;
    }
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' };
      case 'error':
        return { background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' };
      case 'warning':
        return { background: '#fefce8', borderColor: '#fef08a', color: '#854d0e' };
      default:
        return { background: '#f0f9ff', borderColor: '#bae6fd', color: '#075985' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100vw - 40px)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => {
        const style = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1px solid ${style.borderColor}`,
              background: style.background,
              color: style.color,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              fontSize: '0.875rem',
              fontWeight: 500,
              lineHeight: 1.4
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              {getToastIcon(toast.type)}
              <span style={{ whiteSpace: 'pre-line' }}>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: style.color,
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justify: 'center'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
