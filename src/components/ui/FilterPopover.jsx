"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";

export function FilterPopover({
    open,
    onOpenChange,
    triggerLabel = "Filtrar por...",
    triggerContent = null,
    triggerVariant = "outline",
    triggerClassName = "bg-white font-medium pl-10 pr-10 py-2.5 rounded-full min-w-[210px] text-left",
    panelClassName = "w-[320px]",
    panelPositionClassName = "left-0 top-full",
    bodyClassName = "p-4 space-y-4",
    footerClassName = "mt-2 pt-3 border-t flex justify-between",
    applyLabel = "Aplicar",
    clearLabel = "Limpiar",
    onApply,
    onClear,
    children,
}) {
    const anchorRef = useRef(null);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event) => {
            const anchor = anchorRef.current;
            const panel = panelRef.current;
            if (anchor?.contains(event.target) || panel?.contains(event.target)) return;
            onOpenChange?.(false);
        };

        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open, onOpenChange]);

    return (
        <div ref={anchorRef} className="relative inline-block">
            <Button
                variant={triggerVariant}
                className={triggerClassName}
                onClick={() => onOpenChange?.(!open)}
            >
                {triggerContent || triggerLabel}
            </Button>

            {open ? (
                <div
                    ref={panelRef}
                    className={`absolute z-20 mt-2 rounded-2xl border border-border bg-white shadow-card ${panelPositionClassName} ${panelClassName}`}
                >
                    <div className={bodyClassName}>{children}</div>
                    <div className={footerClassName}>
                        <Button variant="ghost" size="sm" className="text-sm text-muted mb-2 ml-2 pb-2" onClick={onClear}>
                            {clearLabel}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-sm mb-2 mr-2 pb-2" onClick={onApply}>
                            {applyLabel}
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function FilterChip({ children, active, onClick }) {
    return (
        <Button
            onClick={onClick}
            variant={active ? "tabActive" : "tabIdle"}
            size="sm"
            className="rounded-full border"
        >
            {children}
        </Button>
    );
}
