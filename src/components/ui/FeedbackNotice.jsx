"use client";

import { useId } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const toneConfig = {
    success: {
        icon: CheckCircle2,
        wrapper: "bg-emerald-100 text-emerald-700",
        border: "border-emerald-200",
        accent: "text-emerald-700",
        glow: "shadow-emerald-100/70",
        role: "status",
        defaultTitle: "Creado con éxito",
    },
    error: {
        icon: XCircle,
        wrapper: "bg-red-100 text-red-700",
        border: "border-red-200",
        accent: "text-red-700",
        glow: "shadow-red-100/70",
        role: "alert",
        defaultTitle: "No se pudo completar",
    },
    warning: {
        icon: AlertTriangle,
        wrapper: "bg-amber-100 text-amber-700",
        border: "border-amber-200",
        accent: "text-amber-700",
        glow: "shadow-amber-100/70",
        role: "alert",
        defaultTitle: "Atención requerida",
    },
    external: {
        icon: AlertTriangle,
        wrapper: "bg-orange-100 text-orange-700",
        border: "border-orange-200",
        accent: "text-orange-700",
        glow: "shadow-orange-100/70",
        role: "alert",
        defaultTitle: "Aviso externo",
    },
    info: {
        icon: Info,
        wrapper: "bg-blue-100 text-blue-700",
        border: "border-blue-200",
        accent: "text-blue-700",
        glow: "shadow-blue-100/70",
        role: "status",
        defaultTitle: "Información",
    },
};

export default function FeedbackNotice({
    open = false,
    tone = "success",
    presentation = "banner",
    title,
    message,
    details,
    actions,
    onClose,
    closeLabel = "Cerrar",
    className = "",
    iconClassName = "",
    showIcon = true,
}) {
    const noticeId = useId();
    const titleId = `${noticeId}-title`;
    const messageId = `${noticeId}-message`;
    const config = toneConfig[tone] || toneConfig.success;
    const Icon = config.icon || Info;
    const isModal = presentation === "modal";
    const hasBody = Boolean(message || details || actions);

    if (!open) return null;

    const cardBase = isModal
        ? "w-full max-w-lg rounded-3xl border bg-white shadow-2xl"
        : "w-full max-w-md rounded-2xl border bg-white shadow-xl";

    const wrapperClass = isModal
        ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
        : "fixed right-4 top-4 z-50 w-full max-w-md p-0 pointer-events-none";

    const cardClass = isModal
        ? `${cardBase} ${config.border} ${className}`
        : `${cardBase} ${config.border} pointer-events-auto ${config.glow} ${className}`;

    const bodyRole = config.role || "status";

    return (
        <div className={wrapperClass}>
            <div
                className={cardClass}
                role={bodyRole}
                aria-live={bodyRole === "alert" ? "assertive" : "polite"}
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={message || details ? messageId : undefined}
            >
                <div className={`flex gap-3 p-4 ${isModal ? "items-start" : "items-start"}`}>
                    {showIcon ? (
                        <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.wrapper} ${iconClassName}`}>
                            <Icon size={22} className="animate-pulse" strokeWidth={2.4} />
                        </div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                        {title ? (
                            <h3 id={titleId} className={`text-base font-semibold ${config.accent}`}>
                                {title}
                            </h3>
                        ) : null}

                        {message ? (
                            <p id={messageId} className="mt-1 text-sm text-slate-600">
                                {message}
                            </p>
                        ) : null}

                        {details ? (
                            <div className="mt-2 text-sm text-slate-700">
                                {details}
                            </div>
                        ) : null}

                        {actions ? <div className="mt-4 flex flex-wrap justify-end gap-2">{actions}</div> : null}
                    </div>

                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={closeLabel}
                            className="ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={16} />
                        </button>
                    ) : null}
                </div>

                {!isModal && hasBody ? <div className="h-1 w-full rounded-b-2xl bg-gradient-to-r from-transparent via-black/5 to-transparent" /> : null}
            </div>
        </div>
    );
}
