import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  // 便利メソッド
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = "info", duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },

  // 便利メソッド
  showSuccess: (message: string, duration = 3000) => {
    get().addToast(message, "success", duration);
  },

  showError: (message: string, duration = 5000) => {
    get().addToast(message, "error", duration);
  },

  showWarning: (message: string, duration = 4000) => {
    get().addToast(message, "warning", duration);
  },

  showInfo: (message: string, duration = 3000) => {
    get().addToast(message, "info", duration);
  },
}));

// 便利なフック（コンポーネントで使いやすくするため）
export const useToast = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastStore();

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
