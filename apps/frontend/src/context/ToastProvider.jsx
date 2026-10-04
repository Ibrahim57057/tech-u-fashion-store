import { useState, useCallback } from "react";
import { ToastContext } from "./ToastContext.js";
import Toast from "../components/ui/Toast.jsx";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // useCallback here matters: showToast is passed down through context
  // to every component in the app. Without useCallback, a new function
  // would be created on every ToastProvider render, which would cause
  // every consumer of useToast() to re-render unnecessarily too.
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className='fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center'>
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
