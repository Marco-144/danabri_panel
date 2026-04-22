import React from "react";

const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
    primary: "bg-primary text-white hover:bg-[#1f2c33]",
    accent: "bg-accent text-white hover:opacity-90",
    outline: "border border-border text-primary hover:bg-background",
    ghost: "text-primary hover:bg-[#dfdfdf]",
    warning : "bg-yellow-500 text-white hover:bg-yellow-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    activo: "bg-activo text-white hover:bg-hoveractivo",
    inactivo: "bg-inactivo text-white hover:bg-hoverinactivo",
    tabActive: "bg-primary text-white border-primary",
    tabIdle: "bg-white text-primary border-border hover:bg-background",
    lightghost: "text-primary hover:bg-[#f0f0f0]",
};

const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
};

export default function Button({
    children,
    variant = "primary",
    size = "md",
    className = "",
    type = "button",
    ...props
}) {
    const variantClass = variants[variant] || variants.primary;
    const sizeClass = sizes[size] || sizes.md;

    return (
        <button type={type} className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props}>
            {children}
        </button>
    );
}
