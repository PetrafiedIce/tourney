"use client";

import * as Toast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { ...toast, id }]);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right">
        {children}
        {messages.map((message) => (
          <Toast.Root
            key={message.id}
            defaultOpen
            onOpenChange={(open) => {
              if (!open) {
                setMessages((current) => current.filter((item) => item.id !== message.id));
              }
            }}
            className={cn(
              "relative grid w-[360px] gap-1 rounded-xl border p-4 shadow-2xl",
              message.variant === "destructive"
                ? "border-rose-500/30 bg-rose-950 text-rose-50"
                : "border-emerald-500/30 bg-zinc-900 text-zinc-50",
            )}
          >
            <Toast.Title className="pr-6 font-medium">{message.title}</Toast.Title>
            {message.description ? (
              <Toast.Description className="text-sm text-zinc-300">{message.description}</Toast.Description>
            ) : null}
            <Toast.Close className="absolute right-3 top-3 rounded p-1 text-zinc-400 hover:text-zinc-50">
              <X className="h-4 w-4" />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed right-4 top-4 z-50 flex max-w-[100vw] flex-col gap-3 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
