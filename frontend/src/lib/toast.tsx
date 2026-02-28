"use client";
import { useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let toastId = 0;
let addToastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "info") {
    addToastFn?.(message, type);
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    addToastFn = (message: string, type: ToastType) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    const bg: Record<ToastType, string> = {
        success: "rgba(22, 163, 74, 0.9)",
        error: "rgba(220, 38, 38, 0.9)",
        info: "rgba(30, 41, 59, 0.95)",
        warning: "rgba(217, 119, 6, 0.9)",
    };

    const icons: Record<ToastType, string> = {
        success: "✅",
        error: "❌",
        info: "ℹ️",
        warning: "⚠️",
    };

    return (
        <>
            {children}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="toast flex items-start gap-3"
                        style={{ background: bg[t.type] }}
                    >
                        <span className="text-lg leading-none mt-0.5">{icons[t.type]}</span>
                        <span className="flex-1 text-white text-sm leading-snug">{t.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                            className="text-white/60 hover:text-white ml-2 shrink-0"
                        >✕</button>
                    </div>
                ))}
            </div>
        </>
    );
}
